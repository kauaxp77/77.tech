import { KanbanBoard } from '@/components/admin/KanbanBoard'
import { fetchLeads } from '@/app/admin/actions'

export const metadata = {
    title: 'Leads | 77xp Admin',
}

export default async function LeadsPage() {
    const leads = await fetchLeads()

    return (
        <div className="space-y-6">
            <header className="border-b border-white/10 pb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">Leads</h1>
                <p className="text-white/50 text-sm mt-1">
                    Arraste os cards entre as etapas ou toque no lead e use &quot;Mover para&quot;.
                </p>
            </header>

            <KanbanBoard initialLeads={leads} />
        </div>
    )
}
