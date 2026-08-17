import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Activity, BarChart3, TrendingUp, Users, DollarSign, Target, PieChart, Focus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function MetricCard({ title, value, subtitle, icon: Icon, colorClass }: any) {
    return (
        <div className="glass bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 group-hover:opacity-30 transition-opacity rounded-full ${colorClass}`} />
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} bg-opacity-20 backdrop-blur-md border border-white/10`}>
                    <Icon className="text-white" size={24} />
                </div>
            </div>
            <div>
                <h3 className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{title}</h3>
                <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                <p className="text-white/40 text-xs mt-2 font-medium">{subtitle}</p>
            </div>
        </div>
    )
}

function calculateEstimatedTicket(projectType: string | null) {
    if (!projectType) return 0;
    if (projectType.includes('SaaS') || projectType.includes('Sistemas')) return 15000;
    if (projectType.includes('E-commerce')) return 8000;
    if (projectType.includes('Escalonável')) return 4000;
    if (projectType.includes('Landing')) return 2500;
    return 1500;
}

export default async function AdminDashboardPage() {
    const supabase = await createClient()

    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        return <div className="text-red-500">Falha ao computar relatórios: {error.message}</div>
    }

    const safeLeads = leads || [];

    // Core KPIs
    const totalLeads = safeLeads.length;
    const leadsQuentes = safeLeads.filter(l => l.priority === 'ALTA' || (l.score || 0) >= 70).length;
    const leadsFechados = safeLeads.filter(l => l.status === 'FECHADO').length;
    const leadsEmNegociacao = safeLeads.filter(l => l.status === 'NEGOCIACAO').length;

    // Financial Heuristics
    const pipelineEstimate = safeLeads
        .filter(l => l.status !== 'PERDIDO' && l.status !== 'FECHADO')
        .reduce((acc, lead) => acc + calculateEstimatedTicket(lead.project_type), 0);

    const revenueClosed = safeLeads
        .filter(l => l.status === 'FECHADO')
        .reduce((acc, lead) => acc + calculateEstimatedTicket(lead.project_type), 0);

    const avgTicket = safeLeads.length > 0 ? (safeLeads.reduce((acc, lead) => acc + calculateEstimatedTicket(lead.project_type), 0) / safeLeads.length) : 0;

    // Funnel Conversions
    const qualitificados = safeLeads.filter(l => (l.score || 0) >= 40).length; // Media ou Alta
    const conversionQualificado = totalLeads ? Math.round((qualitificados / totalLeads) * 100) : 0;
    const conversionProposta = qualitificados ? Math.round((leadsEmNegociacao / qualitificados) * 100) : 0;
    const conversionFechamento = leadsEmNegociacao ? Math.round((leadsFechados / leadsEmNegociacao) * 100) : 0;
    const conversionGlobal = totalLeads ? Math.round((leadsFechados / totalLeads) * 100) : 0;

    // Source Breakdown
    const sources = safeLeads.reduce((acc, l) => {
        const src = l.source || 'Orgânico';
        acc[src] = (acc[src] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent mb-2">Business Operations</h1>
                <p className="text-white/50 text-sm">Cockpit Executivo Fase 5: Monitorando Pipeline e Conversão de Receita.</p>
            </div>

            {/* Strategic Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Volume Total"
                    value={totalLeads}
                    subtitle="Leads Brutos na Base"
                    icon={Users}
                    colorClass="bg-blue-500"
                />
                <MetricCard
                    title="Leads Quentes (ALTA)"
                    value={leadsQuentes}
                    subtitle="Score > 70 ou SLA Ativo"
                    icon={Flame}
                    colorClass="bg-red-500"
                />
                <MetricCard
                    title="Pipeline Estimado"
                    value={`R$ ${(pipelineEstimate / 1000).toFixed(1)}k`}
                    subtitle="Potencial Circulante"
                    icon={DollarSign}
                    colorClass="bg-amber-500"
                />
                <MetricCard
                    title="Ticket Médio"
                    value={`R$ ${(avgTicket / 1000).toFixed(1)}k`}
                    subtitle="Baseado no Custo do Escopo"
                    icon={Target}
                    colorClass="bg-emerald-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Funnel Panel */}
                <div className="lg:col-span-2 glass bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-2"><Filter size={18} className="text-white/50" /> Funil Comercial</h2>

                    <div className="space-y-6">
                        <div className="relative">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-white">Leads Capturados</span>
                                <span className="text-white/50">{totalLeads} unid. (100%)</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-blue-500 h-4 rounded-full" style={{ width: `100%` }}></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">↓ Leads Qualificados <span className="text-[10px] text-green-400 font-mono tracking-widest">{conversionQualificado}% retidos</span></span>
                                <span className="text-white/50">{qualitificados} unid.</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-amber-500 h-4 rounded-full transition-all" style={{ width: `${conversionQualificado}%` }}></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">↓ Em Negociação <span className="text-[10px] text-green-400 font-mono tracking-widest">{conversionProposta}% retidos</span></span>
                                <span className="text-white/50">{leadsEmNegociacao} unid.</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-purple-500 h-4 rounded-full transition-all" style={{ width: `${Math.max(conversionProposta, 2)}%` }}></div>
                            </div>
                        </div>

                        <div className="relative pt-4 border-t border-white/10">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">🏁 Negócios Fechados <span className="text-[10px] text-emerald-400 font-mono tracking-widest">{conversionGlobal}% GLOBAL TX</span></span>
                                <span className="text-white/50 font-bold">{leadsFechados} vitórias (R$ {(revenueClosed / 1000).toFixed(1)}k)</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-emerald-500/30">
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-4 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all" style={{ width: `${Math.max(conversionGlobal, 1)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Source Intelligence */}
                <div className="glass bg-white/5 border border-white/10 rounded-3xl p-8">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><PieChart size={18} className="text-white/50" /> Origem UTM</h2>

                    <div className="space-y-4">
                        {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([source, count], index) => {
                            const percent = Math.round((count / totalLeads) * 100);
                            return (
                                <div key={source} className="group">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-mono text-white/70 uppercase tracking-widest">{source}</span>
                                        <span className="text-white/40">{count} ({percent}%)</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-white/30 h-full group-hover:bg-white transition-colors" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}

                        {Object.keys(sources).length === 0 && (
                            <p className="text-xs text-white/30 text-center py-10">Bases UTM Vazias</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Icon Wrapper for missing icons in this file scope since lucide-react doesn't export "Flame" directly sometimes (wait, it does, but just in case for Filter)
import { Filter, Flame } from 'lucide-react';
