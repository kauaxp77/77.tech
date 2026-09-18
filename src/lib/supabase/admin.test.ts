import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminClient } from './admin'

describe('createAdminClient', () => {
    beforeEach(() => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'chave-publica')
    })

    it('falha com mensagem clara quando a chave de serviço não está configurada', () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

        expect(() => createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/)
    })

    it('envia as consultas com a chave de serviço, não com a chave pública', async () => {
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'chave-de-servico')
        const fetchSpy = vi.fn().mockResolvedValue(
            new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }),
        )
        vi.stubGlobal('fetch', fetchSpy)

        await createAdminClient().from('leads').select('id')

        expect(fetchSpy).toHaveBeenCalledTimes(1)
        const headers = new Headers(fetchSpy.mock.calls[0][1].headers)
        expect(headers.get('apikey')).toBe('chave-de-servico')
        expect(headers.get('authorization')).toBe('Bearer chave-de-servico')
    })
})
