import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/isAdmin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-02-24.acacia' as any
});

const CheckoutRequestSchema = z.object({
    leadId: z.uuid(),
    amount: z.number().positive(),
    name: z.string().trim().min(1),
});

export async function POST(req: Request) {
    // Só admin logado gera cobrança na conta Stripe.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }
    if (!isAdmin(user)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    const parsed = CheckoutRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
        return new NextResponse('Invalid parameters', { status: 400 });
    }
    const { leadId, amount, name } = parsed.data;

    try {
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
                        unit_amount: Math.round(amount * 100), // Stripe exige centavos inteiros
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
