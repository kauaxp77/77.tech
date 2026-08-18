"use client";

import { CreditCard, Loader2 } from "lucide-react";
import { useState } from "react";

interface StripeButtonProps {
    leadId: string;
    amount: number;
    name: string;
}

export function StripeButton({ leadId, amount, name }: StripeButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leadId, amount, name })
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Falha ao gerar link Stripe.");
            }
        } catch (error) {
            alert("Erro de Injeção Stripe.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] active:scale-95"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
            {loading ? "Gerando Fatura..." : "Pagar via Stripe"}
        </button>
    );
}
