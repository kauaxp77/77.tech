import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { Activity, BarChart3, TrendingUp, Users, DollarSign, Target, PieChart, Focus, Download } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { formatarDataHora } from "@/lib/datas";
import type { Reuniao } from "@/components/admin/ListaDeReunioes";
import Link from "next/link";

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

    // Só as 3 próximas reuniões: a agenda completa fica na aba Reuniões.
    const { data: proximas } = await supabase
        .from('meetings')
        .select('id, title, meeting_date, platform, meeting_link, leads(name, company)')
        .gte('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: true })
        .limit(3)

    const proximasReunioes = (proximas ?? []) as unknown as Reuniao[]; // sem a tabela, fica vazio

    if (error) {
        return <div className="text-red-500">Falha ao computar relatórios: {error.message}</div>
    }

    const safeLeads = leads || [];

    // Core KPIs
    const totalLeads = safeLeads.length;
    const leadsQuentes = safeLeads.filter(l => l.priority === 'ALTA' || (l.score || 0) >= 70).length;
    const leadsFechados = safeLeads.filter(l => l.status === 'FECHADO').length;
    const leadsEmNegociacao = safeLeads.filter(l => l.status === 'NEGOCIACAO').length;

    // Recurring Revenue Metrics
    const mrrTotal = safeLeads.reduce((acc, lead) => {
        const baseValue = lead.estimated_value || calculateEstimatedTicket(lead.project_type);
        const mrr = lead.mrr || (baseValue * 0.1); // Assumir 10%
        return acc + mrr;
    }, 0);
    const arrTotal = mrrTotal * 12;

    // Velocity & ACV
    const revenueClosed = safeLeads
        .filter(l => l.status === 'FECHADO')
        .reduce((acc, lead) => acc + (lead.estimated_value || calculateEstimatedTicket(lead.project_type)), 0);

    const avgTicket = leadsFechados > 0 ? (revenueClosed / leadsFechados) : 0;

    // Financial Pipeline (Weighted Forecast)
    const pipelineAtivo = safeLeads
        .filter(l => l.status !== 'PERDIDO' && l.status !== 'FECHADO');

    // SLA Stagnation Checker (More than 15 days in pipeline)
    const stagnantLeads = pipelineAtivo.filter(l => {
        const daysInPipeline = Math.floor((new Date().getTime() - new Date(l.created_at).getTime()) / (1000 * 3600 * 24));
        return daysInPipeline > 15;
    });

    const velocityDays = leadsFechados > 0
        ? Math.floor(safeLeads.filter(l => l.status === 'FECHADO').reduce((acc, l) => acc + (new Date().getTime() - new Date(l.created_at).getTime()), 0) / leadsFechados / (1000 * 3600 * 24))
        : 14;

    const pipelineEstimate = pipelineAtivo
        .reduce((acc, lead) => acc + (lead.estimated_value || calculateEstimatedTicket(lead.project_type)), 0);

    const weightedPipeline = pipelineAtivo
        .reduce((acc, lead) => {
            const baseValue = lead.estimated_value || calculateEstimatedTicket(lead.project_type);
            let probability = 0.1; // NOVO
            if (lead.status === 'CONTATO') probability = 0.3;
            if (lead.status === 'NEGOCIACAO') probability = 0.7;
            return acc + (baseValue * probability);
        }, 0);

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

    // Product Conversion Breakdown
    const productStats = safeLeads.reduce((acc, l) => {
        const type = l.project_type || 'Outro';
        if (!acc[type]) acc[type] = { total: 0, won: 0, revenue: 0 };
        acc[type].total++;
        if (l.status === 'FECHADO') {
            acc[type].won++;
            acc[type].revenue += (l.estimated_value || calculateEstimatedTicket(type));
        }
        return acc;
    }, {} as Record<string, { total: number, won: number, revenue: number }>);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent mb-2">Visão geral</h1>
                    <p className="text-white/50 text-sm">Pipeline, conversão e receita da operação.</p>
                </div>

                <a
                    href="/api/admin/export/csv"
                    download="77xp_leads.csv"
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] active:scale-95"
                >
                    <Download size={16} /> Exportar Excel CSV
                </a>
            </div>

            {/* SLA Alert Banner */}
            {stagnantLeads.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_0_25px_rgba(239,68,68,0.1)]">
                    <div className="flex items-start sm:items-center gap-4">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
                            <Focus size={20} className="text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-red-400 font-bold text-sm uppercase tracking-widest">Alerta de SLA (Gargalo no Funil)</h3>
                            <p className="text-white/70 text-sm mt-1">Você tem <strong className="text-white">{stagnantLeads.length} leads estagnados</strong> há mais de 15 dias no seu CRM sem conversão ou contato recente.</p>
                        </div>
                    </div>
                    <Link href="/admin/crm" className="flex justify-center shrink-0 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all">
                        Resolver agora
                    </Link>
                </div>
            )}

            {/* Strategic Revenue Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <MetricCard
                    title="Receita Realizada (Fechada)"
                    value={`R$ ${(revenueClosed / 1000).toFixed(1)}k`}
                    subtitle="One-Time Revenue"
                    icon={Target}
                    colorClass="bg-emerald-500"
                />
                <MetricCard
                    title="ARR (Annual Recurring)"
                    value={`R$ ${(arrTotal / 1000).toFixed(1)}k`}
                    subtitle={`MRR Atual: R$ ${mrrTotal.toLocaleString()}`}
                    icon={TrendingUp}
                    colorClass="bg-indigo-500"
                />
                <MetricCard
                    title="Forecast (Ponderado)"
                    value={`R$ ${(weightedPipeline / 1000).toFixed(1)}k`}
                    subtitle={`Bruto: R$ ${(pipelineEstimate / 1000).toFixed(1)}k`}
                    icon={DollarSign}
                    colorClass="bg-amber-500"
                />
                <MetricCard
                    title="Ticket Médio (ACV)"
                    value={avgTicket > 0 ? `R$ ${(avgTicket / 1000).toFixed(1)}k` : 'R$ 0.0k'}
                    subtitle="Average Contract Value"
                    icon={Users}
                    colorClass="bg-cyan-500"
                />
                <MetricCard
                    title="Velocidade B2B"
                    value={`${velocityDays} Dias`}
                    subtitle="Tempo Médio C2C (Close)"
                    icon={Activity}
                    colorClass="bg-fuchsia-500"
                />
                <MetricCard
                    title="Win-Rate Global"
                    value={`${conversionGlobal}%`}
                    subtitle={`${leadsFechados} vitórias`}
                    icon={PieChart}
                    colorClass="bg-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visual Funnel Panel */}
                <div className="lg:col-span-2 glass bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-8">
                    <h2 className="text-lg font-bold text-white mb-8 flex items-center gap-2"><Filter size={18} className="text-white/50" /> Funil Comercial</h2>

                    <div className="space-y-6">
                        <div className="relative">
                            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm mb-2">
                                <span className="font-bold text-white">Leads Capturados</span>
                                <span className="text-white/50">{totalLeads} unid. (100%)</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-blue-500 h-4 rounded-full" style={{ width: `100%` }}></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">↓ Leads Qualificados <span className="text-[10px] text-green-400 font-mono tracking-widest">{conversionQualificado}% retidos</span></span>
                                <span className="text-white/50">{qualitificados} unid.</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-amber-500 h-4 rounded-full transition-all" style={{ width: `${conversionQualificado}%` }}></div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">↓ Em Negociação <span className="text-[10px] text-green-400 font-mono tracking-widest">{conversionProposta}% retidos</span></span>
                                <span className="text-white/50">{leadsEmNegociacao} unid.</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-white/10">
                                <div className="bg-purple-500 h-4 rounded-full transition-all" style={{ width: `${Math.max(conversionProposta, 2)}%` }}></div>
                            </div>
                        </div>

                        <div className="relative pt-4 border-t border-white/10">
                            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm mb-2">
                                <span className="font-bold text-white flex items-center gap-2">🏁 Negócios Fechados <span className="text-[10px] text-emerald-400 font-mono tracking-widest">{conversionGlobal}% GLOBAL TX</span></span>
                                <span className="text-white/50 font-bold">{leadsFechados} vitórias (R$ {(revenueClosed / 1000).toFixed(1)}k)</span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden outline outline-1 outline-emerald-500/30">
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-4 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all" style={{ width: `${Math.max(conversionGlobal, 1)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Analytics Panel */}
                <div className="glass bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-8 flex flex-col gap-8">

                    {/* Product Conversion Analytics */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><PieChart size={18} className="text-white/50" /> Conversão Produto</h2>
                        <div className="space-y-4">
                            {(Object.entries(productStats) as [string, { total: number, won: number, revenue: number }][]).sort((a, b) => b[1].revenue - a[1].revenue).map(([type, stats]) => {
                                const winRate = stats.total > 0 ? Math.round((stats.won / stats.total) * 100) : 0;
                                return (
                                    <div key={type} className="group border-b border-white/5 pb-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-mono text-white/70 uppercase tracking-widest truncate">{type}</span>
                                            <span className="text-emerald-400 font-bold">R$ {(stats.revenue / 1000).toFixed(1)}k</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-white/40 mt-1">
                                            <span>Win Rate: {winRate}%</span>
                                            <span>{stats.won} wins (de {stats.total})</span>
                                        </div>
                                    </div>
                                )
                            })}
                            {Object.keys(productStats).length === 0 && <p className="text-xs text-white/30 text-center py-4">Sem Produtos Fechados.</p>}
                        </div>
                    </div>

                    {/* Source Intelligence */}
                    <div>
                        <h2 className="text-sm font-bold text-white/50 mb-4 uppercase tracking-widest">Origem UTM</h2>
                        <div className="space-y-4">
                            {(Object.entries(sources) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([source, count], index) => {
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
                                <p className="text-xs text-white/30 text-center py-4">Bases UTM Vazias</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Próximas reuniões (a agenda completa fica na aba Reuniões) */}
            <section aria-label="Próximas reuniões" className="glass bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2"><Calendar size={18} className="text-white/50" /> Próximas reuniões</h2>
                    <Link href="/admin/reunioes" className="shrink-0 text-xs uppercase tracking-widest text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                        Ver todas
                    </Link>
                </div>

                {proximasReunioes.length === 0 ? (
                    <p className="text-sm text-white/40 py-8 text-center border border-dashed border-white/10 rounded-2xl">Nenhuma reunião marcada.</p>
                ) : (
                    <ul className="grid gap-3 md:grid-cols-3">
                        {proximasReunioes.map((reuniao) => (
                            <li key={reuniao.id} className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-1 min-w-0">
                                <p className="text-white font-bold text-sm break-words">{reuniao.title}</p>
                                <p className="text-xs text-white/50 flex items-center gap-1.5"><Clock size={12} /> {formatarDataHora(reuniao.meeting_date)}</p>
                                <p className="text-xs text-white/30 flex items-center gap-1.5 break-words"><Users size={12} /> {reuniao.leads?.name} ({reuniao.leads?.company || 'PF'})</p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}

// Icon Wrapper for missing icons in this file scope since lucide-react doesn't export "Flame" directly sometimes (wait, it does, but just in case for Filter)
import { Filter, Flame, Calendar, Clock } from 'lucide-react';
