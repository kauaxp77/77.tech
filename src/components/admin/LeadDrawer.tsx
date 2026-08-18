"use client";

import { BaseLead } from "./KanbanBoard";
import { X, Calendar, Clock, Bot, PlusSquare, ArrowRight, Activity, Zap, Focus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScheduleMeetingForm } from "./ScheduleMeetingForm";

interface LeadDrawerProps {
    lead: BaseLead | null;
    onClose: () => void;
}

export function LeadDrawer({ lead, onClose }: LeadDrawerProps) {
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
        // Simulate System Action happening 1 second later
        {
            time: new Date(new Date(lead.created_at).getTime() + 1000).toISOString(),
            icon: <Bot size={14} className="text-purple-400" />,
            title: "CRM Intelligence (Motor de Regras)",
            desc: `Análise AI concluída. Scope: ${lead.project_type}. Score Atribuído: ${lead.score}/100. P: ${lead.priority}.`
        },
        // Pseudo Deduplication event
        ...(isDuplicate ? [{
            time: new Date(new Date(lead.created_at).getTime() + 2000).toISOString(),
            icon: <Zap size={14} className="text-orange-400" />,
            title: "Verificação de Duplicidade",
            desc: "Alerta: Sistema detectou e-mail ou telefone idêntico anterior. Marcado como RECORRENTE."
        }] : []),
        {
            time: new Date(new Date(lead.created_at).getTime() + 3000).toISOString(),
            icon: <Clock size={14} className="text-red-400" />,
            title: "SLA Tracker Iniciado",
            desc: `Cronômetro First Response ativado para expirar em 2 horas úteis.`
        },
    ];

    return (
        <>
            {/* Backdrop layer */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all animation-fade-in"
                onClick={onClose}
            />

            {/* Slide-over Content Drawer */}
            <div className="fixed top-0 right-0 w-full max-w-lg h-screen bg-black/90 border-l border-white/10 z-50 overflow-y-auto flex flex-col shadow-2xl animate-slide-in">

                {/* Header Header */}
                <div className="sticky top-0 bg-black/80 backdrop-blur-md p-6 border-b border-white/10 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-white text-xl font-bold truncate pr-4">{lead.name.replace('⚠️ [RECORRENTE] ', '')}</h2>
                        <span className="text-xs text-white/50">{lead.company || 'Cliente Físico / Sem Empresa'}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scope Dashboard */}
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-1">Lead Score</span>
                            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
                                {lead.score}/100
                            </span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                            <span className="text-[10px] uppercase tracking-widest text-white/30 block mb-1">Status SLA</span>
                            <span className={`text-sm font-bold flex items-center gap-1 ${lead.status !== 'NOVO' ? 'text-green-500' : isExpiredSLA ? 'text-red-500' : 'text-blue-400'}`}>
                                {lead.status !== 'NOVO' ? 'Atendido' : isExpiredSLA ? 'SLA Violado' : 'No Prazo'}
                            </span>
                        </div>
                    </div>

                    {/* Next Best Action (Heuristic AI Layer) */}
                    <div className="mb-6 bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl" />
                        <h3 className="text-[10px] uppercase font-bold tracking-widest text-indigo-300 mb-2 flex items-center gap-2">
                            <Focus size={12} /> Next Best Action Sugerida
                        </h3>
                        <p className="text-sm font-medium text-white/90">
                            {lead.status === 'NOVO' && 'Agendar Call Diagnóstica Inicial para alinhar requisitos.'}
                            {lead.status === 'CONTATO' && 'Sintetizar dores e Gerar Proposta PDF Comercial.'}
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
                            href={`https://wa.me/${lead.phone?.replace(/\D/g, '') || ''}`}
                            target="_blank"
                            className="flex-1 bg-green-500 text-black font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-400 transition-colors"
                        >
                            WhatsApp Rápido
                        </a>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xs uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                            <Activity size={12} /> Activity Timeline
                        </h3>

                        <div className="relative pl-3 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                            {generatedTimeline.map((ev, i) => (
                                <div key={i} className="relative flex items-start gap-4">
                                    <div className="flex bg-black w-5 h-5 rounded-full border border-white/20 items-center justify-center shrink-0 z-10 mt-1">
                                        {ev.icon}
                                    </div>
                                    <div className="flex-1 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-bold text-white">{ev.title}</h4>
                                            <time className="text-[10px] text-white/40">{format(new Date(ev.time), 'HH:mm', { locale: ptBR })}</time>
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
