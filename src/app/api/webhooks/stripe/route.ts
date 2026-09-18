import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { EventBus } from '@/lib/events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any
});

export async function POST(req: Request) {
    // Sem segredo não há como provar que o evento veio do Stripe: recusa tudo.
    // (500 faz o Stripe reenviar; depois de configurado, os reenvios passam.)
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET não configurado: webhook recusado.');
        return new NextResponse('Webhook secret not configured', { status: 500 });
    }

    const sig = req.headers.get('stripe-signature');
    if (!sig) {
        return new NextResponse('Missing stripe-signature header', { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`❌ Webhook Error: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // Lidar com Sucesso Pleno de Checkout
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const leadId = session.metadata?.leadId || session.client_reference_id;

        console.log(`💰 [Stripe] Pagamento confirmado! Sessão ID: ${session.id} | Lead Reference: ${leadId}`);

        if (leadId) {
            // 1. Trancar Oportunidade como FECHADA com a chave de serviço: o evento já teve
            // a assinatura conferida, e o cliente anônimo seria barrado pelo RLS em silêncio.
            const supabase = createAdminClient();
            const { data: updatedLeads, error: dbError } = await supabase
                .from('leads')
                .update({ status: 'FECHADO' })
                .eq('id', leadId)
                .select('id');

            if (dbError) {
                console.error("Erro ao atualizar Lead:", dbError.message);
            } else if (!updatedLeads?.length) {
                console.error(`Lead ${leadId} não encontrado para o pagamento da sessão ${session.id}.`);
            }

            // 2. Disparar Gatilho Assíncrono para o EventBus 2.0
            EventBus.emit('deal.won', {
                leadId,
                amountTotal: session.amount_total,
                currency: session.currency
            });
        }
    }

    return new NextResponse('OK', { status: 200 });
}
