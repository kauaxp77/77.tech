import React from 'react'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
    title: 'Painel Corporativo | 77xp Tech Solutions',
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return <AdminShell emailDoAdmin={user?.email}>{children}</AdminShell>
}
