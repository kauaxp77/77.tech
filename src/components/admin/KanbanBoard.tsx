"use client";

import { useOptimistic, useState, useTransition } from "react";
import { moveLead } from "@/app/admin/actions";
import { Building2, Calendar, ChevronRight, Mail, Phone, ExternalLink } from "lucide-react";

export type BaseLead = {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
    project_type: string | null;
    message: string;
    source: string | null;
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
    const [isPending, startTransition] = useTransition();

    // Optimistic UI array (Imenso aumento de percepção de performance)
    const [optimisticLeads, addOptimisticLead] = useOptimistic(
        leads,
        (state, { id, newStatus }: { id: string; newStatus: string }) =>
            state.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead)
    );

    const handleMove = async (id: string, newStatus: string) => {
        startTransition(() => {
            addOptimisticLead({ id, newStatus });
        });

        try {
            await moveLead(id, newStatus);
            setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
        } catch {
            // Em caso de falha silenciosa do BD, o estado optimista será desfeito automaticamente.
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 w-full overflow-x-auto pb-8 items-start snap-x">
            {STATUS_COLUMNS.map(col => (
                <div key={col.key} className="flex-1 min-w-[320px] max-w-[400px] shrink-0 snap-center bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col h-[70vh] glass">

                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="font-semibold text-sm tracking-wide text-white/80">{col.label}</h2>
                        <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded-full text-white/60">
                            {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).length}
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).map(lead => (
                            <div key={lead.id} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/20 transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-white truncate pr-2">{lead.name}</h3>
                                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-primary)] font-bold">{lead.project_type || 'OUTRO'}</span>
                                </div>

                                <div className="space-y-2 mb-5">
                                    {lead.company && (
                                        <p className="text-xs text-white/50 flex items-center gap-2"><Building2 size={12} /> {lead.company}</p>
                                    )}
                                    <p className="text-xs text-white/50 flex items-center gap-2"><Mail size={12} /> {lead.email}</p>
                                    {lead.phone && (
                                        <p className="text-xs text-white/50 flex items-center gap-2"><Phone size={12} /> {lead.phone}</p>
                                    )}
                                </div>

                                {/* Movement actions (Simulating Drag and Drop flow via Quick Actions for accessibility and stable React 19) */}
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5 mt-auto">
                                    {STATUS_COLUMNS.map((actionCol) => {
                                        if (actionCol.key === col.key) return null;
                                        return (
                                            <button
                                                key={actionCol.key}
                                                onClick={() => handleMove(lead.id, actionCol.key)}
                                                className="text-[10px] uppercase font-bold text-white/40 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-1.5 rounded transition-all flex items-center gap-1"
                                            >
                                                Mover: {actionCol.label.split(" ")[1]} <ChevronRight size={10} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {optimisticLeads.filter(l => (l.status || 'NOVO') === col.key).length === 0 && (
                            <div className="h-full flex items-center justify-center flex-col text-white/20 p-6 text-center border border-dashed border-white/10 rounded-2xl">
                                <p className="text-sm">Vazio</p>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
