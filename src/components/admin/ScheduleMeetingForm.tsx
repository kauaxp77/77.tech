"use client";

import { useState, useTransition } from "react";
import { scheduleMeeting } from "@/app/admin/actions";
import { CalendarPlus, Loader2 } from "lucide-react";

export function ScheduleMeetingForm({ leadId }: { leadId: string }) {
    const [isPending, startTransition] = useTransition();
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [link, setLink] = useState("");

    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!title || !date || !time) return;

        const isoDate = new Date(`${date}T${time}:00`).toISOString();

        startTransition(async () => {
            try {
                const res = await scheduleMeeting(leadId, title, isoDate, "Google Meet", link);

                if (res?.error) {
                    setMessage({ text: res.error, type: 'error' });
                } else {
                    setMessage({ text: "Reunião cravada na Agenda!", type: 'success' });
                    setTitle(""); setDate(""); setTime(""); setLink(""); // Reset
                    setTimeout(() => setMessage(null), 5000); // Apaga depois de 5 segundos
                }
            } catch (err: any) {
                setMessage({ text: "Erro interno de comunicação.", type: 'error' });
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="mb-8 bg-black/40 border border-emerald-500/30 rounded-2xl p-5">
            <h3 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4 flex items-center gap-2">
                <CalendarPlus size={14} /> Agendar Nova Call
            </h3>

            <div className="space-y-3">
                <input
                    type="text"
                    placeholder="Ex: Call de Discovery"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                    <input
                        type="date"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                    <input
                        type="time"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                </div>
                <input
                    type="url"
                    placeholder="Link do Meet/Zoom (Opcional)"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                />

                {message && (
                    <div className={`text-xs p-3 rounded-lg flex items-center gap-2 font-bold ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/20' : 'bg-red-900/40 text-red-400 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    disabled={isPending}
                    type="submit"
                    className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CalendarPlus size={14} />}
                    {isPending ? "Registrando..." : "Agendar no Sistema"}
                </button>
            </div>
        </form>
    );
}
