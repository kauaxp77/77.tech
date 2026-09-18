import { describe, expect, it } from 'vitest'
import { isAdmin } from './isAdmin'

describe('isAdmin', () => {
    it('aceita quem tem o papel admin definido pelo servidor (app_metadata)', () => {
        expect(isAdmin({ app_metadata: { provider: 'email', role: 'admin' } })).toBe(true)
    })

    it('recusa quem só se declarou admin no próprio perfil (user_metadata, editável pelo usuário)', () => {
        const intruso = { app_metadata: { provider: 'email' }, user_metadata: { role: 'admin' } }

        expect(isAdmin(intruso)).toBe(false)
    })

    it('recusa usuário sem papel e visitante sem sessão', () => {
        expect(isAdmin({ app_metadata: { provider: 'email' } })).toBe(false)
        expect(isAdmin(null)).toBe(false)
        expect(isAdmin(undefined)).toBe(false)
    })
})
