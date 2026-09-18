import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// A criação da sessão é uma chamada de rede ao Stripe: é a única parte simulada.
const { criarSessao } = vi.hoisted(() => ({ criarSessao: vi.fn() }))
vi.mock('stripe', () => ({
    default: class {
        checkout = { sessions: { create: criarSessao } }
    },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { POST } from './route'

const LEAD_ID = '3f1c2b4e-8a6d-4c7e-9f10-2b3c4d5e6f70'

const admin: User = {
    id: 'a1b2c3d4-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@77xp.com',
    // Papel gravado pelo servidor: é o único que vale.
    app_metadata: { provider: 'email', providers: ['email'], role: 'admin' },
    user_metadata: {},
    created_at: '2026-08-17T00:00:00Z',
}
const naoAdmin: User = {
    ...admin,
    id: 'a1b2c3d4-0000-4000-8000-000000000002',
    email: 'visitante@exemplo.com',
    app_metadata: { provider: 'email', providers: ['email'] },
}
// Se deu o papel de admin no próprio perfil (user_metadata é editável pelo usuário).
const intruso: User = { ...naoAdmin, id: 'a1b2c3d4-0000-4000-8000-000000000003', email: 'intruso@exemplo.com', user_metadata: { role: 'admin' } }

function sessaoComo(user: User | null) {
    vi.mocked(createClient).mockResolvedValue({
        auth: {
            getUser: vi.fn().mockResolvedValue(
                user
                    ? { data: { user }, error: null }
                    : { data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' } },
            ),
        },
    } as unknown as Awaited<ReturnType<typeof createClient>>)
}

function pedido(corpo: unknown) {
    return new Request('http://localhost/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
    })
}

describe('POST /api/stripe/checkout', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        criarSessao.mockResolvedValue({
            id: 'cs_test_abc',
            object: 'checkout.session',
            mode: 'payment',
            status: 'open',
            payment_status: 'unpaid',
            amount_total: 400000,
            currency: 'brl',
            client_reference_id: LEAD_ID,
            metadata: { leadId: LEAD_ID },
            url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
        })
    })

    it('recusa (401) quem não está logado, sem criar cobrança', async () => {
        sessaoComo(null)

        const resposta = await POST(pedido({ leadId: LEAD_ID, amount: 4000, name: 'Cliente' }))

        expect(resposta.status).toBe(401)
        expect(criarSessao).not.toHaveBeenCalled()
    })

    it('recusa (403) usuário logado que não é admin, sem criar cobrança', async () => {
        sessaoComo(naoAdmin)

        const resposta = await POST(pedido({ leadId: LEAD_ID, amount: 4000, name: 'Cliente' }))

        expect(resposta.status).toBe(403)
        expect(criarSessao).not.toHaveBeenCalled()
    })

    it('recusa (403) quem só se declarou admin no próprio perfil, sem criar cobrança', async () => {
        sessaoComo(intruso)

        const resposta = await POST(pedido({ leadId: LEAD_ID, amount: 4000, name: 'Cliente' }))

        expect(resposta.status).toBe(403)
        expect(criarSessao).not.toHaveBeenCalled()
    })

    it.each([
        ['valor zero', { leadId: LEAD_ID, amount: 0, name: 'Cliente' }],
        ['valor negativo', { leadId: LEAD_ID, amount: -10, name: 'Cliente' }],
        ['valor em texto', { leadId: LEAD_ID, amount: '4000', name: 'Cliente' }],
        ['lead que não é um id válido', { leadId: 'qualquer-coisa', amount: 4000, name: 'Cliente' }],
        ['nome vazio', { leadId: LEAD_ID, amount: 4000, name: '   ' }],
        ['corpo que não é JSON', 'isto não é json'],
    ])('recusa (400) pedido de admin com %s, sem criar cobrança', async (_caso, corpo) => {
        sessaoComo(admin)

        const resposta = await POST(pedido(corpo))

        expect(resposta.status).toBe(400)
        expect(criarSessao).not.toHaveBeenCalled()
    })

    it('admin com pedido válido: cria a cobrança em centavos inteiros, ligada ao lead', async () => {
        sessaoComo(admin)

        const resposta = await POST(pedido({ leadId: LEAD_ID, amount: 1234.567, name: 'Cliente' }))

        expect(resposta.status).toBe(200)
        expect(await resposta.json()).toEqual({ url: 'https://checkout.stripe.com/c/pay/cs_test_abc' })
        expect(criarSessao).toHaveBeenCalledTimes(1)
        const parametros = criarSessao.mock.calls[0][0]
        expect(parametros.line_items[0].price_data.unit_amount).toBe(123457)
        expect(parametros.line_items[0].price_data.currency).toBe('brl')
        expect(parametros.client_reference_id).toBe(LEAD_ID)
        expect(parametros.metadata).toEqual({ leadId: LEAD_ID })
    })
})
