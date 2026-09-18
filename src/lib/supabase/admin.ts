import { createClient } from '@supabase/supabase-js'

/**
 * Cliente com a chave de serviço: ignora o RLS. Use SÓ em código de servidor
 * que já validou a origem da chamada (ex.: webhook com assinatura conferida).
 * Nunca importe em componentes de cliente.
 */
export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceRoleKey) {
        throw new Error('Supabase de serviço não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
    }

    return createClient(url, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}
