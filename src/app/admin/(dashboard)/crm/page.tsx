import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/admin/KanbanBoard'
import { fetchLeads } from '../actions'

export const metadata = {
    title: 'CRM Board | 77xp Admin',
}

export default async function AdminPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const leads = await fetchLeads()

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[var(--color-primary)]/5 blur-[150px] rounded-full" />
            </div>

            <main className="relative z-10 max-w-7xl mx-auto flex flex-col h-full">
                <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">CRM Operacional</h1>
                        <p className="text-white/40 text-sm mt-1">Gerenciamento Dinâmico de Oportunidades 77XP</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-widest text-[var(--color-primary)] font-bold">Admin Ativo</p>
                            <p className="text-sm font-mono text-white/60">{user?.email}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full border border-[var(--color-primary)]/50 flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                <KanbanBoard initialLeads={leads} />
            </main>
        </div>
    )
}
