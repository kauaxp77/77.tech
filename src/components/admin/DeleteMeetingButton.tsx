"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteMeeting } from "@/app/admin/actions";

export function DeleteMeetingButton({ meetingId }: { meetingId: string }) {
    const [isPending, startTransition] = useTransition();

    return (
        <button
            title="Excluir Reunião"
            onClick={() => {
                if (confirm("Tem certeza que deseja cancelar e excluir esta reunião?")) {
                    startTransition(async () => {
                        try {
                            await deleteMeeting(meetingId);
                        } catch (err: any) {
                            alert(err.message);
                        }
                    });
                }
            }}
            disabled={isPending}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors shrink-0 disabled:opacity-50"
        >
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
    );
}
