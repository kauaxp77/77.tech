import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fakeSupabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { GET } from './route'

const usuarioBase: User = {
    id: 'a1b2c3d4-0000-4000-8000-000000000020',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'usuario@exemplo.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-08-17T00:00:00Z',
}
const adminDeVerdade: User = { ...usuarioBase, email: 'admin@77xp.com', app_metadata: { ...usuarioBase.app_metadata, role: 'admin' } }
const intruso: User = { ...usuarioBase, email: 'intruso@exemplo.com', user_metadata: { role: 'admin' } }

const lead = {
    id: '3f1c2b4e-8a6d-4c7e-9f10-2b3c4d5e6f70',
    name: 'Ana Souza',
    email: 'ana@cliente.com',
    phone: '61999990000',
    company: 'Cliente LTDA',
    project_type: 'saas',
    message: 'Preciso de um sistema de agendamento.',
    source: 'website_contact_form',
    score: 55,
    priority: 'MEDIA',
    sla_deadline: '2026-09-18T14:00:00Z',
    status: 'NOVO',
    created_at: '2026-09-18T12:00:00Z',
    estimated_value: null,
    mrr: null,
    arr: null,
    loss_reason: null,
}

describe('GET /api/admin/export/csv', () => {
    let fake: ReturnType<typeof createFakeSupabase>

    function logadoComo(user: User | null) {
        const getUser = vi.fn().mockResolvedValue(
            user
                ? { data: { user }, error: null }
                : { data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' } },
        )
        vi.mocked(createClient).mockResolvedValue({ ...fake.client, auth: { getUser } } as unknown as Awaited<ReturnType<typeof createClient>>)
    }

    beforeEach(() => {
        fake = createFakeSupabase({ leads: { data: [lead], error: null } })
    })

    it('recusa (401) visitante sem sessão', async () => {
        logadoComo(null)

        const resposta = await GET(new Request('http://localhost/api/admin/export/csv'))

        expect(resposta.status).toBe(401)
        expect(fake.queries).toHaveLength(0)
    })

    it('recusa (401) quem só se declarou admin no próprio perfil, sem ler os leads', async () => {
        logadoComo(intruso)

        const resposta = await GET(new Request('http://localhost/api/admin/export/csv'))

        expect(resposta.status).toBe(401)
        expect(fake.queries).toHaveLength(0)
    })

    it('admin de verdade recebe a planilha com os leads', async () => {
        logadoComo(adminDeVerdade)

        const resposta = await GET(new Request('http://localhost/api/admin/export/csv'))

        expect(resposta.status).toBe(200)
        expect(resposta.headers.get('content-type')).toContain('text/csv')
        expect(await resposta.text()).toContain('ana@cliente.com')
    })
})
