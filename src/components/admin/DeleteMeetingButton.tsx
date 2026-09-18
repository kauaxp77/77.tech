"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteMeeting } from "@/app/admin/actions";

export function DeleteMeetingButton({ meetingId, titulo }: { meetingId: string; titulo: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    return (
        <button
            type="button"
            aria-label={`Excluir reunião ${titulo}`}
            title="Excluir reunião"
            onClick={() => {
                if (!confirm(`Cancelar e excluir a reunião "${titulo}"?`)) return;
                startTransition(async () => {
                    try {
                        await deleteMeeting(meetingId);
                        router.refresh();
                    } catch (erro) {
                        alert(erro instanceof Error ? erro.message : "Não foi possível excluir a reunião.");
                    }
                });
            }}
            disabled={isPending}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors shrink-0 disabled:opacity-50"
        >
            {isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Trash2 size={14} aria-hidden />}
        </button>
    );
}
