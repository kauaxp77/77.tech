'use client';

import { Printer } from "lucide-react";

export function PrintButton() {
    return (
        <button
            onClick={() => window.print()}
            className="bg-emerald-500 hover:bg-emerald-400 transition-colors text-white px-6 py-2.5 rounded-full font-bold select-none cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
            <Printer size={18} />
            Baixar Proposta em PDF
        </button>
    )
}
