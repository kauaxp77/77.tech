"use client";

import { useOptimistic, useState, useTransition } from "react";
import { moveLead } from "@/app/admin/actions";
import { Building2, Calendar, ChevronRight, Mail, Phone, Flame, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LeadDrawer } from "./LeadDrawer";

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

const STATUS_COLUMNS = [
    { key: "NOVO", label: "🟢 Novos Contatos" },
    { key: "CONTATO", label: "🟡 Em Contato" },
    { key: "NEGOCIACAO", label: "🔵 Negociação Mútua" },
    { key: "FECHADO", label: "🟣 Fechado / Ganho" },
    { key: "PERDIDO", label: "🔴 Perdido / Arquivado" }
];

export function KanbanBoard({ initialLeads }: { initialLeads: BaseLead[] }) {
    const [leads, setLeads] = useState<BaseLead[]>(initialLeads);
    const [selectedLead, setSelectedLead] = useState<BaseLead | null>(null);
    const [isPending, startTransition] = useTransition();

    // Modal States para Reason For Loss
    const [lossModalOpen, setLossModalOpen] = useState(false);
    const [pendingLossLeadId, setPendingLossLeadId] = useState<string | null>(null);
    const [lossReason, setLossReason] = useState("");

    const [optimisticLeads, addOptimisticLead] = useOptimistic(
        leads,
        (state, update: { id: string; newStatus: string; metadata?: any }) =>
            state.map(lead => lead.id === update.id ? { ...lead, status: update.newStatus, ...update.metadata } : lead)
    );

    const handleMove = async (id: string, newStatus: string, metadata?: any) => {
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
        if (leadId) {
            const lead = optimisticLeads.find(l => l.id === leadId);
            if (lead && lead.status !== columnKey) {
                if (columnKey === 'PERDIDO') {
                    setPendingLossLeadId(leadId);
                    setLossModalOpen(true);
                } else {
                    handleMove(leadId, columnKey);
                }
            }
        }
    };

    return (
        <>
            {/* Loss Reason Modal */}
            {lossModalOpen && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-2">Motivo da Perda</h3>
                        <p className="text-sm text-neutral-400 mb-6">Classifique a objeção principal do cliente para ajudar nosso BI.</p>
                        <select value={lossReason} onChange={(e) => setLossReason(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-white mb-6 focus:ring-[var(--color-primary)] outline-none">
                            <option value="">Selecione um motivo...</option>
                            <option value="Orçamento">Orçamento baixo</option>
                            <option value="Concorrente">Fechou com concorrente</option>
                            <option value="Sem Resposta">Ghosting / Sem Resposta</option>
                            <option value="Escopo">Escopo Inadequado</option>
                            <option value="Timing">Timing Errado</option>
                        </select>
                        <div className="flex gap-4">
                            <button onClick={() => { setLossModalOpen(false); setPendingLossLeadId(null); }} className="flex-1 bg-white/5 py-3 rounded-xl block text-center hover:bg-white/10 text-white transition">Cancelar</button>
                            <button onClick={() => {
                                if (!lossReason) return;
                                handleMove(pendingLossLeadId!, "PERDIDO", { loss_reason: lossReason });
                                setLossModalOpen(false);
                                setPendingLossLeadId(null);
                            }} className="flex-1 bg-red-600 font-bold py-3 rounded-xl block text-center hover:bg-red-500 text-white transition">Confirmar Perda</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 w-full overflow-x-auto pb-8 items-start snap-x">
                {STATUS_COLUMNS.map(col => (
                    <div
                        key={col.key}
                        className="flex-1 min-w-[320px] max-w-[400px] shrink-0 snap-center bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col h-[70vh] glass transition-all"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.key)}
                    >
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="font-semibold text-sm tracking-wide text-white/80 select-none">{col.label}</h2>
                            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded-full text-white/60">
                                {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-10">
                            {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).map(lead => {

                                // CRM Intelligence Checks
                                const score = lead.score || 0;
                                const priority = lead.priority || 'BAIXA';
                                const isExpiredSLA = lead.sla_deadline ? new Date() > new Date(lead.sla_deadline) : false;

                                return (
                                    <div
                                        key={lead.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedLead(lead)}
                                        className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/30 hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all group cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h3 className="font-bold text-white truncate pr-2 select-none pointer-events-none">{lead.name}</h3>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded select-none ${priority === 'ALTA' ? 'bg-red-500/20 text-red-500' :
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

                                        <div className="space-y-2 mb-4 pointer-events-none">
                                            {lead.company && (
                                                <p className="text-xs text-white/50 flex items-center gap-2"><Building2 size={12} /> {lead.company}</p>
                                            )}
                                            <p className="text-xs text-white/50 flex items-center gap-2"><Mail size={12} /> {lead.email}</p>
                                            {lead.phone && (
                                                <p className="text-xs text-white/50 flex items-center gap-2"><Phone size={12} /> {lead.phone}</p>
                                            )}
                                            {lead.sla_deadline && lead.status === 'NOVO' && (
                                                <p className={`text-[10px] flex items-center gap-2 font-medium ${isExpiredSLA ? 'text-red-400' : 'text-blue-400'}`}>
                                                    <Clock size={10} />
                                                    SLA: {isExpiredSLA ? 'Vencido' : 'Expira'} {formatDistanceToNow(new Date(lead.sla_deadline), { addSuffix: true, locale: ptBR })}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                                            <div className="text-xs font-mono text-white/50 bg-white/5 px-2 py-1 rounded">
                                                R$ {lead.estimated_value?.toLocaleString('pt-BR') || '---'}
                                            </div>
                                            {lead.mrr ? <div className="text-[10px] font-bold text-blue-400 bg-blue-900/20 px-2 py-1 rounded tracking-widest uppercase">MRR: R$ {lead.mrr.toLocaleString('pt-BR')}</div> : null}
                                        </div>
                                    </div>
                                )
                            })}

                            {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).length === 0 && (
                                <div className="h-full flex items-center justify-center flex-col text-white/20 p-6 text-center border border-dashed border-white/10 rounded-2xl select-none">
                                    <p className="text-sm">Arraste para cá</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
        </>
    );
}
