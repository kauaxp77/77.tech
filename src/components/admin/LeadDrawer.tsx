"use client";

import { useState, useEffect } from "react";
import { BaseLead } from "./KanbanBoard";
import { X, Calendar, Clock, Bot, PlusSquare, ArrowRight, Activity, Zap, Focus, ShieldCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScheduleMeetingForm } from "./ScheduleMeetingForm";
import { getLeadAudits } from "@/app/admin/actions";

interface LeadDrawerProps {
    lead: BaseLead | null;
    onClose: () => void;
}

export function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
    const [realLogs, setRealLogs] = useState<any[]>([]);

    useEffect(() => {
        if (lead) {
            getLeadAudits(lead.id).then(setRealLogs);
        }
    }, [lead]);

    if (!lead) return null;

    const isExpiredSLA = lead.sla_deadline ? new Date() > new Date(lead.sla_deadline) : false;
    const isDuplicate = lead.name.includes('[RECORRENTE]');

    const generatedTimeline = [
        {
            time: lead.created_at,
            icon: <PlusSquare size={14} className="text-blue-400" />,
            title: "Lead Capturado",
            desc: `Origem originária anotada: ${lead.source || 'Orgânico'} (Calculadora via Web)`
        },
        {
            time: lead.created_at,
            title: `Lead Capturado via ${lead.source || 'Orgânico'}`,
            desc: `O prospect iniciou a jornada de qualificação. Score Incial: ${lead.score || 0}`,
            icon: <Zap size={10} className="text-emerald-400" />
        }
    ];

    if (lead.score && lead.score > 50) {
        generatedTimeline.push({
            time: new Date(new Date(lead.created_at).getTime() + 1000 * 60 * 60 * 2).toISOString(),
            title: 'Qualificação Aprovada pela IA',
            desc: 'Sistema marcou lead como Quente devido ao Score.',
            icon: <Bot size={10} className="text-purple-400" />
        });
    }

    const auditTimeline = realLogs.map(log => ({
        time: log.created_at,
        title: `Ação Auditada: ${log.action.replace('STATUS_CHANGED_TO_', 'Movido para ')}`,
        desc: `Obrado por: ${log.user_email || 'Supervisor B2B'}`,
        icon: <ShieldCheck size={10} className="text-emerald-500" />
    }));

    const finalTimeline = [...generatedTimeline, ...auditTimeline].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 transition-opacity" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-neutral-900 border-l border-white/10 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 overflow-y-auto">
                <div className="p-6 pb-20">
                    <button onClick={onClose} className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-colors">
                        <X size={18} />
                    </button>

                    <h2 className="text-2xl font-black text-white mb-1 pr-10">{lead.name}</h2>
                    <p className="text-white/40 text-sm mb-6">{lead.email}</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Lead Score</h3>
                            <p className="text-2xl font-black text-yellow-500">{lead.score || 0}<span className="text-sm text-white/20">/100</span></p>
                        </div>
                        <div className="bg-black/50 p-4 rounded-2xl border border-white/5">
                            <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Status SLA</h3>
                            <p className="text-lg font-bold text-emerald-400 tracking-tight">Atendido</p>
                        </div>
                    </div>

                    {/* AI Next Best Action Engine */}
                    <div className="bg-[#0f0c29] border border-purple-500/20 p-5 rounded-2xl mb-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 blur-xl group-hover:blur-md transition-all">
                            <Bot size={64} className="text-purple-400" />
                        </div>
                        <h3 className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mb-3 flex items-center gap-2">
                            <Focus size={12} /> Next Best Action Sugerida
                        </h3>
                        <p className="text-white text-sm font-medium leading-relaxed relative z-10">
                            {lead.status === 'ENVIADO' && 'Apresentar pacote MVP B2B. Lead possui perfil de alto ticket.'}
                            {lead.status === 'ANALISE' && 'Exigido Discovery Call urgente para refinamento de escopo técnico.'}
                            {lead.status === 'PROPOSTA' && 'Aguardar resposta do cliente. Acionar gatilho de urgência em 48h.'}
                            {lead.status === 'NEGOCIACAO' && 'Fazer Follow-up de quebra de objeções (Fechamento).'}
                            {lead.status === 'FECHADO' && 'Emitir e enviar Contrato Digital para Kick-off.'}
                            {lead.status === 'PERDIDO' && 'Programar e-mail de reativação para daqui a 6 meses.'}
                        </p>
                    </div>

                    {/* Form de Agendamento */}
                    <ScheduleMeetingForm leadId={lead.id} />

                    {/* Operational Triggers */}
                    <div className="flex gap-4 mb-8">
                        <a
                            href={`/admin/proposal/${lead.id}`}
                            target="_blank"
                            className="flex-1 bg-white text-black font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors shadow-lg"
                        >
                            Gerar Proposta PDF
                        </a>
                        <a
                            href={`/api/stripe/checkout`} // dummy button if we want or just remove
                            className="hidden"
                        >
                        </a>
                        <a
                            href={`https://wa.me/${lead.phone?.replace(/\D/g, '') || ''}`}
                            target="_blank"
                            className="flex-1 bg-green-500 text-black font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                        >
                            WhatsApp Rápido
                        </a>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                            <Activity size={12} /> Historico & Logs
                        </h3>

                        <div className="relative pl-3 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                            {finalTimeline.map((ev, i) => (
                                <div key={i} className="relative flex items-start gap-4">
                                    <div className="flex bg-black w-5 h-5 rounded-full border border-white/20 items-center justify-center shrink-0 z-10 mt-1">
                                        {ev.icon}
                                    </div>
                                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                                            <time className="text-[10px] text-white/40">{format(new Date(ev.time), 'dd/MM HH:mm', { locale: ptBR })}</time>
                                        </div>
                                        <p className="text-xs text-white/60">{ev.desc}</p>
                                    </div>
                                </div>
                            ))}
                            {/* Current Status Anchor */}
                            <div className="relative flex items-start gap-4">
                                <div className="flex bg-black w-5 h-5 rounded-full border border-white/20 items-center justify-center shrink-0 z-10 mt-1">
                                    <ArrowRight size={14} className="text-green-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] uppercase font-bold text-white/40 pt-1">
                                        Estágio Atual: {lead.status}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs uppercase tracking-widest text-white/50 mb-3 mt-8">Escopo e Mensagem Original</h3>
                        <div className="bg-black/50 border border-white/5 p-4 rounded-2xl">
                            <p className="text-sm text-white/80 leading-relaxed font-serif italic">
                                "{lead.message}"
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}
