import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeSupabase } from '@/test/fakeSupabase'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/events', () => ({ EventBus: { emit: vi.fn() } }))

import { createClient } from '@/lib/supabase/server'
import { EventBus } from '@/lib/events'
import { GET } from './route'

const leadParado = { id: 'lead-parado', name: 'Ana', status: 'NEGOCIACAO', created_at: '2026-09-10T12:00:00Z' }
const leadRecente = { id: 'lead-recente', name: 'Bruno', status: 'NEGOCIACAO', created_at: '2026-09-16T12:00:00Z' }

function chamadaDoCron(authorization?: string) {
    const headers = authorization ? { authorization } : undefined
    return new Request('http://localhost/api/cron/stagnation', { headers })
}

describe('GET /api/cron/stagnation', () => {
    let fake: ReturnType<typeof createFakeSupabase>

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-09-18T12:00:00Z'))
        fake = createFakeSupabase({ leads: { data: [leadParado, leadRecente], error: null } })
        vi.mocked(createClient).mockResolvedValue(fake.client as unknown as Awaited<ReturnType<typeof createClient>>)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('recusa (401) quando CRON_SECRET não está configurado, sem consultar o banco', async () => {
        vi.stubEnv('CRON_SECRET', '')

        const resposta = await GET(chamadaDoCron())

        expect(resposta.status).toBe(401)
        expect(fake.queries).toHaveLength(0)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('recusa (401) chamada com chave errada', async () => {
        vi.stubEnv('CRON_SECRET', 'segredo-do-cron')

        const resposta = await GET(chamadaDoCron('Bearer chave-errada'))

        expect(resposta.status).toBe(401)
        expect(EventBus.emit).not.toHaveBeenCalled()
    })

    it('com a chave certa, alerta só os leads em negociação há 5 dias ou mais', async () => {
        vi.stubEnv('CRON_SECRET', 'segredo-do-cron')

        const resposta = await GET(chamadaDoCron('Bearer segredo-do-cron'))

        expect(resposta.status).toBe(200)
        expect(EventBus.emit).toHaveBeenCalledTimes(1)
        expect(EventBus.emit).toHaveBeenCalledWith('lead.stagnated', leadParado)
    })
})
