import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fakeSupabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/events', () => ({ EventBus: { emit: vi.fn() } }))
// revalidatePath depende do contexto de requisição do Next; aqui só precisa existir.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { EventBus } from '@/lib/events'
import { deleteMeeting, fetchLeads, getLeadAudits, moveLead, scheduleMeeting } from './actions'

const LEAD_ID = '3f1c2b4e-8a6d-4c7e-9f10-2b3c4d5e6f70'
const MEETING_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

const usuarioBase: User = {
    id: 'a1b2c3d4-0000-4000-8000-000000000030',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'usuario@exemplo.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-08-17T00:00:00Z',
}
const adminDeVerdade: User = { ...usuarioBase, email: 'admin@77xp.com', app_metadata: { ...usuarioBase.app_metadata, role: 'admin' } }
const intruso: User = { ...usuarioBase, email: 'intruso@exemplo.com', user_metadata: { role: 'admin' } }

const leadNoBanco = { id: LEAD_ID, name: 'Ana Souza', email: 'ana@cliente.com', status: 'NOVO', created_at: '2026-09-18T12:00:00Z' }

let fake: ReturnType<typeof createFakeSupabase>

function logadoComo(user: User) {
    const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null })
    vi.mocked(createClient).mockResolvedValue({ ...fake.client, auth: { getUser } } as unknown as Awaited<ReturnType<typeof createClient>>)
}

beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fake = createFakeSupabase({
        leads: { data: [leadNoBanco], error: null },
        audit_logs: { data: [], error: null },
        meetings: { data: [], error: null },
    })
})

describe('ações do painel chamadas por quem NÃO é admin', () => {
    beforeEach(() => logadoComo(intruso))

    it('fetchLeads devolve lista vazia sem consultar o banco', async () => {
        expect(await fetchLeads()).toEqual([])
        expect(fake.queries).toHaveLength(0)
    })

    it('moveLead é recusado sem alterar nada', async () => {
        await expect(moveLead(LEAD_ID, 'FECHADO')).rejects.toThrow()
        expect(fake.queries).toHaveLength(0)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('scheduleMeeting devolve erro sem criar reunião', async () => {
        const resultado = await scheduleMeeting(LEAD_ID, 'Call de alinhamento', '2026-09-20T15:00:00Z', 'Google Meet', 'https://meet.google.com/abc')

        expect(resultado).toHaveProperty('error')
        expect(fake.queries).toHaveLength(0)
    })

    it('getLeadAudits devolve lista vazia sem consultar o banco', async () => {
        expect(await getLeadAudits(LEAD_ID)).toEqual([])
        expect(fake.queries).toHaveLength(0)
    })

    it('deleteMeeting é recusado sem apagar nada', async () => {
        await expect(deleteMeeting(MEETING_ID)).rejects.toThrow()
        expect(fake.queries).toHaveLength(0)
    })
})

describe('ações do painel chamadas pelo admin', () => {
    beforeEach(() => logadoComo(adminDeVerdade))

    it('fetchLeads devolve os leads', async () => {
        expect(await fetchLeads()).toEqual([leadNoBanco])
    })

    it('moveLead muda o status, grava a auditoria com o admin e avisa o EventBus', async () => {
        await moveLead(LEAD_ID, 'CONTATO')

        expect(fake.queries.map((q) => q.table)).toEqual(['leads', 'audit_logs'])
        expect(fake.queries[0].ops).toContainEqual(['update', { status: 'CONTATO' }])
        expect(fake.queries[1].ops).toContainEqual([
            'insert',
            [expect.objectContaining({ entity_id: LEAD_ID, user_email: 'admin@77xp.com' })],
        ])
        expect(EventBus.emit).toHaveBeenCalledWith('lead.stage_changed', { leadId: LEAD_ID, newStatus: 'CONTATO' })
    })
})
