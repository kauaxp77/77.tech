import Link from 'next/link'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Propostas | 77xp Admin',
}

type LeadComProposta = {
    id: string
    name: string
    company: string | null
    project_type: string | null
    status: 'NEGOCIACAO' | 'FECHADO'
}

export default async function PropostasPage() {
    const supabase = await createClient()
    const { data } = await supabase
        .from('leads')
        .select('id, name, company, project_type, status')
        .in('status', ['NEGOCIACAO', 'FECHADO'])
        .order('created_at', { ascending: false })

    const leads = (data ?? []) as LeadComProposta[]

    return (
        <div className="space-y-6">
            <header className="border-b border-white/10 pb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Propostas</h1>
                <p className="text-white/50 text-sm mt-1">Leads em negociação ou fechados, com a proposta comercial de cada um.</p>
            </header>

            {leads.length === 0 ? (
                <p className="text-sm text-white/40 py-12 text-center border border-dashed border-white/10 rounded-3xl">
                    Nenhum lead em negociação ou fechado ainda.
                </p>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {leads.map((lead) => (
                        <li key={lead.id} className="glass bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="font-bold text-white break-words">{lead.name}</p>
                                    <p className="text-sm text-white/50 break-words">{lead.company || 'Pessoa física'}</p>
                                </div>
                                <span
                                    className={`shrink-0 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${lead.status === 'FECHADO'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-blue-500/15 text-blue-400'
                                        }`}
                                >
                                    {lead.status === 'FECHADO' ? 'Fechado' : 'Em negociação'}
                                </span>
                            </div>

                            {lead.project_type && (
                                <p className="text-xs font-mono uppercase tracking-widest text-white/40">{lead.project_type}</p>
                            )}

                            <Link
                                href={`/admin/proposal/${lead.id}`}
                                aria-label={`Abrir proposta de ${lead.name}`}
                                className="mt-auto inline-flex items-center justify-center gap-2 bg-white text-black font-bold text-sm py-2.5 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                <FileText size={16} aria-hidden /> Abrir proposta
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
