import { Clock, Users, Video } from "lucide-react";
import { formatarDataHora } from "@/lib/datas";
import { DeleteMeetingButton } from "./DeleteMeetingButton";

export type Reuniao = {
    id: string;
    title: string;
    meeting_date: string;
    platform: string | null;
    meeting_link: string | null;
    leads: { name: string; company: string | null } | null;
};

export function ListaDeReunioes({
    titulo,
    reunioes,
    textoVazio,
    passadas = false,
}: {
    titulo: string;
    reunioes: Reuniao[];
    textoVazio: string;
    passadas?: boolean;
}) {
    return (
        <section aria-label={titulo} className="glass bg-white/5 border border-white/10 rounded-3xl p-5 sm:p-6">
            <h2 className="text-base font-bold text-white mb-4">{titulo}</h2>

            {reunioes.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center border border-dashed border-white/10 rounded-2xl">{textoVazio}</p>
            ) : (
                <ul className="space-y-3">
                    {reunioes.map((reuniao) => (
                        <li
                            key={reuniao.id}
                            className={`bg-black/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3 ${passadas ? "opacity-60" : ""}`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <Video size={14} className="text-white/70" aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-bold text-sm text-white break-words">{reuniao.title}</p>
                                <p className="text-xs text-white/60 flex items-center gap-1.5">
                                    <Clock size={12} aria-hidden /> {formatarDataHora(reuniao.meeting_date)}
                                    {reuniao.platform ? ` · ${reuniao.platform}` : ""}
                                </p>
                                {reuniao.leads && (
                                    <p className="text-xs text-white/40 flex items-center gap-1.5 break-words">
                                        <Users size={12} aria-hidden /> {reuniao.leads.name} ({reuniao.leads.company || "Pessoa física"})
                                    </p>
                                )}
                                {reuniao.meeting_link && !passadas && (
                                    <a
                                        href={reuniao.meeting_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-block mt-2 text-xs font-bold text-emerald-300 bg-emerald-900/30 px-3 py-1.5 rounded-lg hover:bg-emerald-800/40 transition-colors"
                                    >
                                        Entrar na chamada
                                    </a>
                                )}
                            </div>
                            <DeleteMeetingButton meetingId={reuniao.id} titulo={reuniao.title} />
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
