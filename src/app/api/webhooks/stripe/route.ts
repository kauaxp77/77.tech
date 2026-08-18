import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { EventBus } from '@/lib/events';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event: Stripe.Event;

    try {
        if (!sig || !endpointSecret) {
            console.warn("⚠️ Stripe Webhook Secret não configurado ou Assinatura Inexistente. Rodando em modo Inseguro para Desenvolvimento.");
            event = JSON.parse(body); // Fallback local
        } else {
            event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
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
            const supabase = await createClient();

            // 1. Trancar Oportunidade como FECHADA no Backend usando Server Role
            // (Assumimos que o RBAC não barra server-to-server aqui, mas passaremos cookie bypass se necessário)
            const { error: dbError } = await supabase
                .from('leads')
                .update({ status: 'FECHADO' })
                .eq('id', leadId);

            if (dbError) {
                console.error("Erro ao atualizar Lead:", dbError.message);
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
