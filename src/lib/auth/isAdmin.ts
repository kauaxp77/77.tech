import type { User } from '@supabase/supabase-js'

/**
 * Admin é quem tem role "admin" em app_metadata: só o servidor (chave de serviço
 * ou SQL no painel do Supabase) consegue gravar esse campo.
 * Nunca use user_metadata para permissão: o próprio usuário pode editá-lo.
 */
export function isAdmin(user: Pick<User, 'app_metadata'> | null | undefined): boolean {
    return user?.app_metadata?.role === 'admin'
}
