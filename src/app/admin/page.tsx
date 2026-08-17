import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Activity, BarChart3, TrendingUp, Users } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function MetricCard({ title, value, subtitle, icon: Icon, colorClass }: any) {
    return (
        <div className="glass bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full ${colorClass}`} />

            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-20 backdrop-blur-md border border-white/10`}>
                    <Icon className="text-white" size={24} />
                </div>
            </div>

            <div>
                <h3 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
                <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
                <p className="text-white/40 text-sm mt-2 font-medium">{subtitle}</p>
            </div>
        </div>
    )
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    // Buscando as estatísticas brutas direto do Supabase via SQL otimizada (Server-Side)
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="text-red-500">Falha ao computar relatórios: {error.message}</div>
    }

    const totalLeads = leads?.length || 0
    const novos = leads?.filter(l => l.status === 'NOVO').length || 0
    const emNegociacao = leads?.filter(l => l.status === 'CONTATO' || l.status === 'NEGOCIACAO').length || 0
    const fechados = leads?.filter(l => l.status === 'FECHADO').length || 0

    // Calcula um proxy de conversão
    const conversionRate = totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : '0.0'

    // Pega as últimas 5 captações para a tabela visual
    const recentLeads = leads?.slice(0, 5) || []

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent mb-2">Visão Estratégica</h1>
                <p className="text-white/50 text-lg">Métricas e acompanhamento de receita da 77xp Tech Solutions em tempo real.</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Volume Total de Captação"
                    value={totalLeads}
                    subtitle="Tickets orgânicos e anúncios"
                    icon={BarChart3}
                    colorClass="bg-[#2D8CFF]"
                />
                <MetricCard
                    title="Leads Frios / Novos"
                    value={novos}
                    subtitle="Aguardando primeira abordagem"
                    icon={Users}
                    colorClass="bg-[#8B5CF6]"
                />
                <MetricCard
                    title="Em Negociação Ativa"
                    value={emNegociacao}
                    subtitle="Reuniões cimentadas ou trâmites"
                    icon={Activity}
                    colorClass="bg-[#F59E0B]"
                />
                <MetricCard
                    title="Taxa de Conversão"
                    value={`${conversionRate}%`}
                    subtitle="Projetos Fechados vs Volume Total"
                    icon={TrendingUp}
                    colorClass="bg-[#10B981]"
                />
            </div>

            {/* Ultimas Transações / Leads Table */}
            <div className="glass bg-white/5 border border-white/10 rounded-3xl p-8 mt-8">
                <h2 className="text-xl font-bold text-white mb-6">Radar de Aquisições Recentes</h2>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                                <th className="pb-4 font-medium pl-2">Cliente Alvo</th>
                                <th className="pb-4 font-medium">Classificação</th>
                                <th className="pb-4 font-medium">Orçamento / Escopo</th>
                                <th className="pb-4 font-medium text-right pr-2">Aterrisagem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 pl-2">
                                        <p className="text-white font-medium">{lead.name}</p>
                                        <p className="text-xs text-white/40">{lead.company}</p>
                                    </td>
                                    <td className="py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border
                                            ${lead.status === 'NOVO' && 'bg-blue-500/10 text-blue-400 border-blue-500/20'}
                                            ${(lead.status === 'CONTATO' || lead.status === 'NEGOCIACAO') && 'bg-amber-500/10 text-amber-400 border-amber-500/20'}
                                            ${lead.status === 'FECHADO' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                                            ${lead.status === 'PERDIDO' && 'bg-red-500/10 text-red-500 border-red-500/20'}
                                        `}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <p className="text-sm text-white/80">{lead.project_type}</p>
                                    </td>
                                    <td className="py-4 text-right pr-2">
                                        <span className="text-xs text-white/40">
                                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {recentLeads.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-white/40 text-sm">
                                        Nenhum projeto detectado no radar do servidor ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
