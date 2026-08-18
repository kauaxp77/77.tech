import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any
});

export async function POST(req: Request) {
    try {
        const { leadId, amount, name } = await req.json();

        if (!leadId || !amount) {
            return new NextResponse('Missing parameters', { status: 400 });
        }

        // Criando Sessão Transparente Frictionless B2B
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'boleto'],
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: `Arquitetura: ${name}`,
                            description: `Pagamento de Escopo Estipulado para ${name} / ID Oportunidade: ${leadId}`
                        },
                        unit_amount: amount * 100, // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            client_reference_id: leadId,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/proposal/${leadId}?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/admin/proposal/${leadId}?canceled=true`,
            metadata: {
                leadId: leadId
            }
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe Checkout Error:', error);
        return new NextResponse(`Stripe Failed: ${error.message}`, { status: 500 });
    }
}
