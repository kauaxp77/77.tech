import Stripe from 'stripe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fakeSupabase'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
// O cliente anônimo (com cookies) é o que a versão antiga usava; o fake imita o RLS
// atual, em que o update anônimo não afeta nenhuma linha.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/events', () => ({ EventBus: { emit: vi.fn() } }))

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { EventBus } from '@/lib/events'
import { POST } from './route'

const SEGREDO = 'whsec_teste_local'
const LEAD_ID = '3f1c2b4e-8a6d-4c7e-9f10-2b3c4d5e6f70'
// Instância real do Stripe, usada só para assinar os eventos como o Stripe faria.
const stripe = new Stripe('sk_test_somente_para_assinar')

function evento(type: string, object: Record<string, unknown>) {
    return {
        id: 'evt_test_123',
        object: 'event',
        api_version: '2025-02-24.acacia',
        created: 1789000000,
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type,
        data: { object },
    }
}

const checkoutPago = evento('checkout.session.completed', {
    id: 'cs_test_abc',
    object: 'checkout.session',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    amount_total: 400000,
    currency: 'brl',
    client_reference_id: LEAD_ID,
    metadata: { leadId: LEAD_ID },
})

// assinarCom: null = sem cabeçalho de assinatura
function requisicao(corpo: object, assinarCom: string | null = SEGREDO) {
    const payload = JSON.stringify(corpo)
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (assinarCom !== null) {
        headers['stripe-signature'] = stripe.webhooks.generateTestHeaderString({ payload, secret: assinarCom })
    }
    return new Request('http://localhost/api/webhooks/stripe', { method: 'POST', headers, body: payload })
}

describe('POST /api/webhooks/stripe', () => {
    let admin: ReturnType<typeof createFakeSupabase>
    let anonimo: ReturnType<typeof createFakeSupabase>

    beforeEach(() => {
        vi.stubEnv('STRIPE_WEBHOOK_SECRET', SEGREDO)
        vi.spyOn(console, 'log').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.spyOn(console, 'error').mockImplementation(() => {})

        admin = createFakeSupabase({ leads: { data: [{ id: LEAD_ID }], error: null } })
        anonimo = createFakeSupabase({ leads: { data: [], error: null } })
        vi.mocked(createAdminClient).mockReturnValue(admin.client as unknown as ReturnType<typeof createAdminClient>)
        vi.mocked(createClient).mockResolvedValue(anonimo.client as unknown as Awaited<ReturnType<typeof createClient>>)
    })

    it('recusa (400) requisição sem assinatura e não mexe em nada', async () => {
        const resposta = await POST(requisicao(checkoutPago, null))

        expect(resposta.status).toBe(400)
        expect(admin.queries).toHaveLength(0)
        expect(anonimo.queries).toHaveLength(0)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('recusa (400) evento assinado com outro segredo', async () => {
        const resposta = await POST(requisicao(checkoutPago, 'whsec_de_um_atacante'))

        expect(resposta.status).toBe(400)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('responde 500 sem processar nada quando STRIPE_WEBHOOK_SECRET não está configurado', async () => {
        vi.stubEnv('STRIPE_WEBHOOK_SECRET', '')

        const resposta = await POST(requisicao(checkoutPago))

        expect(resposta.status).toBe(500)
        expect(admin.queries).toHaveLength(0)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('pagamento confirmado: move o lead para FECHADO com o acesso de serviço e dispara deal.won', async () => {
        const resposta = await POST(requisicao(checkoutPago))

        expect(resposta.status).toBe(200)
        expect(admin.queries).toHaveLength(1)
        expect(admin.queries[0].table).toBe('leads')
        expect(admin.queries[0].ops).toContainEqual(['update', { status: 'FECHADO' }])
        expect(admin.queries[0].ops).toContainEqual(['eq', 'id', LEAD_ID])
        expect(EventBus.emit).toHaveBeenCalledWith('deal.won', { leadId: LEAD_ID, amountTotal: 400000, currency: 'brl' })
    })

    it('lead inexistente: registra no log e responde 200 para o Stripe não reenviar', async () => {
        admin = createFakeSupabase({ leads: { data: [], error: null } })
        vi.mocked(createAdminClient).mockReturnValue(admin.client as unknown as ReturnType<typeof createAdminClient>)

        const resposta = await POST(requisicao(checkoutPago))

        expect(resposta.status).toBe(200)
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining(LEAD_ID))
    })

    it('ignora outros tipos de evento', async () => {
        const outroEvento = evento('payment_intent.created', {
            id: 'pi_test_abc',
            object: 'payment_intent',
            amount: 400000,
            currency: 'brl',
            status: 'requires_payment_method',
        })

        const resposta = await POST(requisicao(outroEvento))

        expect(resposta.status).toBe(200)
        expect(admin.queries).toHaveLength(0)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })
})
