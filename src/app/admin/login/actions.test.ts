import fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureRedirect } from '@/test/redirect'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { login } from './actions'

function credenciais(email: string, password: string) {
    const form = new FormData()
    form.set('email', email)
    form.set('password', password)
    return form
}

describe('login (server action)', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(createClient).mockResolvedValue({
            auth: {
                signInWithPassword: vi.fn().mockResolvedValue({
                    data: { user: null, session: null },
                    error: { name: 'AuthApiError', status: 400, message: 'Invalid login credentials' },
                }),
            },
        } as unknown as Awaited<ReturnType<typeof createClient>>)
    })

    it('senha errada volta para a tela de login com aviso, mesmo com o disco somente leitura (Vercel)', async () => {
        // Na Vercel o sistema de arquivos é somente leitura: qualquer escrita lança EROFS.
        vi.spyOn(fs, 'appendFileSync').mockImplementation(() => {
            throw Object.assign(new Error("EROFS: read-only file system, open 'auth-error.log'"), { code: 'EROFS' })
        })

        const destino = await captureRedirect(() => login(credenciais('admin@77xp.com', 'senha-errada')))

        expect(destino).toBe('/admin/login?error=true')
    })
})
