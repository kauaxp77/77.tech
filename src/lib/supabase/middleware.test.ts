import type { User } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

// O cliente do Supabase fala com o servidor de autenticação (rede): só o getUser é simulado.
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => ({ auth: { getUser } })) }))

import { updateSession } from './middleware'

const usuarioBase: User = {
    id: 'a1b2c3d4-0000-4000-8000-000000000010',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'usuario@exemplo.com',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: '2026-08-17T00:00:00Z',
}
const adminDeVerdade: User = { ...usuarioBase, email: 'admin@77xp.com', app_metadata: { ...usuarioBase.app_metadata, role: 'admin' } }
const intruso: User = { ...usuarioBase, email: 'intruso@exemplo.com', user_metadata: { role: 'admin' } }

function logadoComo(user: User | null) {
    getUser.mockResolvedValue(
        user
            ? { data: { user }, error: null }
            : { data: { user: null }, error: { name: 'AuthSessionMissingError', status: 400, message: 'Auth session missing!' } },
    )
}

function abrir(caminho: string) {
    return updateSession(new NextRequest(`http://localhost:3000${caminho}`))
}

describe('proteção das páginas /admin (updateSession)', () => {
    it('visitante sem sessão em /admin vai para a tela de login', async () => {
        logadoComo(null)

        const resposta = await abrir('/admin')

        expect(resposta.headers.get('location')).toBe('http://localhost:3000/admin/login')
    })

    it('quem só se declarou admin no próprio perfil é mandado para a página inicial', async () => {
        logadoComo(intruso)

        const resposta = await abrir('/admin/crm')

        expect(resposta.headers.get('location')).toBe('http://localhost:3000/')
    })

    it('admin de verdade (papel definido pelo servidor) entra no painel', async () => {
        logadoComo(adminDeVerdade)

        const resposta = await abrir('/admin/crm')

        expect(resposta.headers.get('location')).toBeNull()
        expect(resposta.status).toBe(200)
    })

    it('admin de verdade que abre a tela de login vai direto para o painel', async () => {
        logadoComo(adminDeVerdade)

        const resposta = await abrir('/admin/login')

        expect(resposta.headers.get('location')).toBe('http://localhost:3000/admin')
    })

    it('quem só se declarou admin continua na tela de login', async () => {
        logadoComo(intruso)

        const resposta = await abrir('/admin/login')

        expect(resposta.headers.get('location')).toBeNull()
    })
})
