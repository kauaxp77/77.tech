"use client";

import { useOptimistic, useState, useTransition } from "react";
import { moveLead } from "@/app/admin/actions";
import { Building2, Mail, Phone, Flame, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadDrawer } from "./LeadDrawer";
import { ETAPAS } from "./etapas";

export type BaseLead = {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
    project_type: string | null;
    message: string;
    source: string | null;
    score?: number;
    priority?: string;
    sla_deadline?: string;
    loss_reason?: string;
    estimated_value?: number;
    mrr?: number;
    arr?: number;
    status: string;
    created_at: string;
};

export function KanbanBoard({ initialLeads }: { initialLeads: BaseLead[] }) {
    const [leads, setLeads] = useState<BaseLead[]>(initialLeads);
    const [leadAbertoId, setLeadAbertoId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // Modal States para Reason For Loss
    const [lossModalOpen, setLossModalOpen] = useState(false);
    const [pendingLossLeadId, setPendingLossLeadId] = useState<string | null>(null);
    const [lossReason, setLossReason] = useState("");

    const [optimisticLeads, addOptimisticLead] = useOptimistic(
        leads,
        (state, update: { id: string; newStatus: string; metadata?: Partial<BaseLead> }) =>
            state.map(lead => lead.id === update.id ? { ...lead, status: update.newStatus, ...update.metadata } : lead)
    );

    const handleMove = async (id: string, newStatus: string, metadata?: { loss_reason?: string }) => {
        startTransition(() => {
            addOptimisticLead({ id, newStatus, metadata });
        });

        try {
            await moveLead(id, newStatus, metadata);
            setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus, ...metadata } : l));
        } catch {
            // Revert state naturally by Next
        }
    };

    // Arrastar (computador) e "Mover para" (gaveta, funciona no toque) passam por aqui.
    const pedirMudanca = (id: string, novaEtapa: string) => {
        const lead = optimisticLeads.find(l => l.id === id);
        if (!lead || (lead.status || 'NOVO') === novaEtapa) return;
        if (novaEtapa === 'PERDIDO') {
            setPendingLossLeadId(id);
            setLossModalOpen(true);
        } else {
            handleMove(id, novaEtapa);
        }
    };

    // Native HTML5 Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData("leadId", id);
        // Visual feedback during drag
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessário para permitir o "Drop"
    };

    const handleDrop = (e: React.DragEvent, columnKey: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData("leadId");
        if (leadId) pedirMudanca(leadId, columnKey);
    };

    const leadAberto = optimisticLeads.find(l => l.id === leadAbertoId) ?? null;

    return (
        <>
            {/* Loss Reason Modal (acima da gaveta do lead) */}
            {lossModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
                    <div role="dialog" aria-modal="true" aria-labelledby="motivo-perda-titulo" className="bg-neutral-900 border border-red-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
                        <h3 id="motivo-perda-titulo" className="text-xl font-bold text-white mb-2">Motivo da Perda</h3>
                        <p className="text-sm text-neutral-400 mb-6">Classifique a objeção principal do cliente para ajudar nosso BI.</p>
                        <select aria-label="Motivo da perda" value={lossReason} onChange={(e) => setLossReason(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white mb-6 focus:ring-[var(--color-primary)] outline-none">
                            <option value="">Selecione um motivo...</option>
                            <option value="Orçamento">Orçamento baixo</option>
                            <option value="Concorrente">Fechou com concorrente</option>
                            <option value="Sem Resposta">Ghosting / Sem Resposta</option>
                            <option value="Escopo">Escopo Inadequado</option>
                            <option value="Timing">Timing Errado</option>
                        </select>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => { setLossModalOpen(false); setPendingLossLeadId(null); }} className="flex-1 bg-white/5 py-3 rounded-xl block text-center hover:bg-white/10 text-white transition">Cancelar</button>
                            <button type="button" onClick={() => {
                                if (!lossReason) return;
                                handleMove(pendingLossLeadId!, "PERDIDO", { loss_reason: lossReason });
                                setLossModalOpen(false);
                                setPendingLossLeadId(null);
                            }} className="flex-1 bg-red-600 font-bold py-3 rounded-xl block text-center hover:bg-red-500 text-white transition">Confirmar Perda</button>
                        </div>
                    </div>
                </div>
            )}

            {/* No celular as colunas deslizam para o lado, uma por tela. */}
            <div data-rolagem-horizontal className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
                {ETAPAS.map(col => {
                    const leadsDaEtapa = optimisticLeads.filter(l => (l.status || 'NOVO') === col.key);
                    return (
                        <section
                            key={col.key}
                            aria-label={col.nome}
                            className="w-[85vw] max-w-[360px] sm:w-[320px] shrink-0 snap-start bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col h-[65vh] sm:h-[70vh] glass transition-all"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.key)}
                        >
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h2 className="font-semibold text-sm tracking-wide text-white/80 select-none">
                                    <span aria-hidden>{col.marcador} </span>{col.nome}
                                </h2>
                                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded-full text-white/60">
                                    {leadsDaEtapa.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar pb-10">
                                {leadsDaEtapa.map(lead => {

                                    // CRM Intelligence Checks
                                    const score = lead.score || 0;
                                    const priority = lead.priority || 'BAIXA';
                                    const isExpiredSLA = lead.sla_deadline ? new Date() > new Date(lead.sla_deadline) : false;

                                    return (
                                        <div
                                            key={lead.id}
                                            role="button"
                                            tabIndex={0}
                                            aria-label={lead.company ? `${lead.name} — ${lead.company}` : lead.name}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => setLeadAbertoId(lead.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setLeadAbertoId(lead.id);
                                                }
                                            }}
                                            className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/30 hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all group cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                        >
                                            <div className="flex justify-between items-start mb-3 gap-2">
                                                <h3 className="font-bold text-white truncate select-none pointer-events-none">{lead.name}</h3>
                                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded select-none shrink-0 ${priority === 'ALTA' ? 'bg-red-500/20 text-red-500' :
                                                    priority === 'MEDIA' ? 'bg-amber-500/20 text-amber-500' :
                                                        'bg-green-500/10 text-green-500'
                                                    }`}>
                                                    P: {priority}
                                                </span>
                                            </div>

                                            {/* Score Meter */}
                                            <div className="flex items-center gap-2 mb-4 bg-white/5 p-2 rounded-lg pointer-events-none">
                                                <Flame size={14} className={score > 70 ? 'text-orange-500' : 'text-white/30'} />
                                                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-orange-600 to-yellow-400"
                                                        style={{ width: `${Math.min(score, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-mono text-white/50">{score}/100</span>
                                            </div>

                                            <div className="space-y-2 mb-4 pointer-events-none min-w-0">
                                                {lead.company && (
                                                    <p className="text-xs text-white/50 flex items-center gap-2 truncate"><Building2 size={12} className="shrink-0" /> {lead.company}</p>
                                                )}
                                                <p className="text-xs text-white/50 flex items-center gap-2 truncate"><Mail size={12} className="shrink-0" /> {lead.email}</p>
                                                {lead.phone && (
                                                    <p className="text-xs text-white/50 flex items-center gap-2"><Phone size={12} className="shrink-0" /> {lead.phone}</p>
                                                )}
                                                {lead.sla_deadline && lead.status === 'NOVO' && (
                                                    <p className={`text-[10px] flex items-center gap-2 font-medium ${isExpiredSLA ? 'text-red-400' : 'text-blue-400'}`}>
                                                        <Clock size={10} />
                                                        SLA: {isExpiredSLA ? 'Vencido' : 'Expira'} {formatDistanceToNow(new Date(lead.sla_deadline), { addSuffix: true, locale: ptBR })}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                                <div className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">
                                                    R$ {lead.estimated_value?.toLocaleString('pt-BR') || '---'}
                                                </div>
                                                {lead.mrr ? <div className="text-[10px] font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded tracking-widest uppercase">MRR: R$ {lead.mrr.toLocaleString('pt-BR')}</div> : null}
                                            </div>
                                        </div>
                                    )
                                })}

                                {leadsDaEtapa.length === 0 && (
                                    <div className="h-full flex items-center justify-center flex-col text-white/20 p-6 text-center border border-dashed border-white/10 rounded-2xl select-none">
                                        <p className="text-sm">Arraste para cá</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )
                })}
            </div>
            <LeadDrawer
                lead={leadAberto}
                onClose={() => setLeadAbertoId(null)}
                onMover={(novaEtapa) => leadAberto && pedirMudanca(leadAberto.id, novaEtapa)}
            />
        </>
    );
}
