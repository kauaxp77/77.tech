"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { scheduleMeeting } from "@/app/admin/actions";

type LeadOpcao = { id: string; name: string; company: string | null };

const PLATAFORMAS = ["Google Meet", "Zoom", "Microsoft Teams", "WhatsApp", "Presencial"];

const estiloCampo =
    "mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50";
const estiloRotulo = "block text-xs font-medium text-white/60";

/**
 * Marca uma reunião. Na aba Reuniões escolhe o lead numa lista; dentro da gaveta
 * de um lead recebe o leadId pronto.
 */
export function AgendarReuniaoForm({ leadId, leads = [] }: { leadId?: string; leads?: LeadOpcao[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [leadEscolhido, setLeadEscolhido] = useState(leadId ?? "");
    const [assunto, setAssunto] = useState("");
    const [data, setData] = useState("");
    const [horario, setHorario] = useState("");
    const [plataforma, setPlataforma] = useState(PLATAFORMAS[0]);
    const [link, setLink] = useState("");
    const [mensagem, setMensagem] = useState<{ texto: string; tipo: "sucesso" | "erro" } | null>(null);

    const enviar = (evento: React.FormEvent) => {
        evento.preventDefault();
        setMensagem(null);
        if (!leadEscolhido || !assunto || !data || !horario) return;

        // Data e hora digitadas no horário de quem está usando (Brasília para a equipe).
        const quando = new Date(`${data}T${horario}:00`).toISOString();

        startTransition(async () => {
            const resultado = await scheduleMeeting(leadEscolhido, assunto, quando, plataforma, link);
            if (resultado?.error) {
                setMensagem({ texto: resultado.error, tipo: "erro" });
                return;
            }
            setMensagem({ texto: "Reunião marcada!", tipo: "sucesso" });
            setAssunto("");
            setData("");
            setHorario("");
            setLink("");
            if (!leadId) setLeadEscolhido("");
            router.refresh();
        });
    };

    return (
        <form aria-label="Marcar reunião" onSubmit={enviar} className="bg-black/40 border border-emerald-500/30 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-2">
                <CalendarPlus size={14} aria-hidden /> Marcar reunião
            </h3>

            {!leadId && (
                <label className={estiloRotulo}>
                    Lead
                    <select required value={leadEscolhido} onChange={(e) => setLeadEscolhido(e.target.value)} className={estiloCampo}>
                        <option value="">Escolha o lead…</option>
                        {leads.map((lead) => (
                            <option key={lead.id} value={lead.id}>
                                {lead.company ? `${lead.name} — ${lead.company}` : lead.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <label className={estiloRotulo}>
                Assunto
                <input
                    type="text"
                    required
                    placeholder="Ex.: Apresentação da proposta"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    className={estiloCampo}
                />
            </label>

            <div className="grid grid-cols-2 gap-3">
                <label className={estiloRotulo}>
                    Data
                    <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={estiloCampo} />
                </label>
                <label className={estiloRotulo}>
                    Horário
                    <input type="time" required value={horario} onChange={(e) => setHorario(e.target.value)} className={estiloCampo} />
                </label>
            </div>

            <label className={estiloRotulo}>
                Plataforma
                <select value={plataforma} onChange={(e) => setPlataforma(e.target.value)} className={estiloCampo}>
                    {PLATAFORMAS.map((opcao) => (
                        <option key={opcao} value={opcao}>
                            {opcao}
                        </option>
                    ))}
                </select>
            </label>

            <label className={estiloRotulo}>
                Link da chamada
                <input
                    type="url"
                    placeholder="https://meet.google.com/… (opcional)"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className={estiloCampo}
                />
            </label>

            {mensagem && (
                <p
                    role="status"
                    className={`text-xs p-3 rounded-lg font-bold ${mensagem.tipo === "sucesso"
                        ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-900/40 text-red-400 border border-red-500/20"
                        }`}
                >
                    {mensagem.texto}
                </p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
                {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <CalendarPlus size={14} aria-hidden />}
                {isPending ? "Marcando…" : "Marcar reunião"}
            </button>
        </form>
    );
}
