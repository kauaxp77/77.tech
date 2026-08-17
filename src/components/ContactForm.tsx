"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { LeadSchema } from "@/schemas/lead";

type FormState = "idle" | "loading" | "success" | "error";

export function ContactForm() {
    const [formState, setFormState] = useState<FormState>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormState("loading");
        setErrorMessage("");

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries()) as any;

        // Injecting hidden tracking context
        data.source = window.location.pathname;

        const validation = LeadSchema.safeParse(data);

        if (!validation.success) {
            setErrorMessage("Por favor, verifique os campos em vermelho ou preencha tudo corretamente.");
            setFormState("error");
            return;
        }

        try {
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(validation.data),
            });

            const bodyResult = await response.json();

            if (!response.ok) {
                throw new Error(bodyResult.error || "Falha ao enviar.");
            }

            setFormState("success");
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || "Servidor instável no momento. Tente novamente.");
            setFormState("error");
        }
    };

    return (
        <div className="glass p-8 md:p-12 rounded-3xl border border-white/10 w-full max-w-2xl mx-auto relative overflow-hidden">
            {/* Loading Overlay */}
            {formState === "loading" && (
                <div className="absolute inset-0 z-20 bg-[#050505]/80 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
                </div>
            )}

            {/* Success State */}
            {formState === "success" && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-30 bg-[#050505] flex flex-col items-center justify-center p-8 text-center"
                >
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Engenharia Notificada.</h3>
                    <p className="text-[var(--color-text-secondary)] mb-8">Recebemos sua mensagem! Nossa equipe entrará em contato muito em breve.</p>
                    <Button onClick={() => setFormState("idle")} variant="outline">
                        Enviar nova mensagem
                    </Button>
                </motion.div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {formState === "error" && (
                    <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 transition-all">
                        <AlertCircle size={20} className="shrink-0" />
                        <span className="text-sm font-medium">{errorMessage}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-[var(--color-text-secondary)]">Nome <span className="text-[var(--color-primary)]">*</span></label>
                        <input name="name" required type="text" id="name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all" placeholder="Seu nome completo" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-[var(--color-text-secondary)]">E-mail corporativo <span className="text-[var(--color-primary)]">*</span></label>
                        <input name="email" required type="email" id="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all" placeholder="nome@empresa.com" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="company" className="text-sm font-medium text-[var(--color-text-secondary)]">Empresa</label>
                        <input name="company" type="text" id="company" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all" placeholder="Nome da empresa" />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="phone" className="text-sm font-medium text-[var(--color-text-secondary)]">Telefone</label>
                        <input name="phone" type="tel" id="phone" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all" placeholder="(00) 00000-0000" />
                    </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="projectType" className="text-sm font-medium text-[var(--color-text-secondary)]">Tipo de Projeto</label>
                    <select name="projectType" id="projectType" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all appearance-none">
                        <option value="" className="bg-[#050505]">Selecione uma opção</option>
                        <option value="saas" className="bg-[#050505]">Plataforma SaaS</option>
                        <option value="landing_page" className="bg-[#050505]">Landing Page & CMS</option>
                        <option value="api" className="bg-[#050505]">Integração / API</option>
                        <option value="infra" className="bg-[#050505]">Infraestrutura / DevOps</option>
                        <option value="other" className="bg-[#050505]">Outro</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium text-[var(--color-text-secondary)]">Mensagem <span className="text-[var(--color-primary)]">*</span></label>
                    <textarea name="message" required id="message" rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent transition-all resize-none" placeholder="Conte-nos um pouco sobre seu desafio..." />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={formState === "loading"}>
                    Enviar solicitação
                </Button>
            </form>
        </div>
    );
}
