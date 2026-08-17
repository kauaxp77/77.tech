"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalculatorAnswers, useCalculatorStore } from "@/store/useCalculatorStore";
import { calculateEstimation, formatCalculatorToLeadPayload } from "@/lib/estimationEngine";
import { Button } from "@/components/ui/Button";
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const optionsData = {
    step1: [
        { value: "saas", label: "Sistema SaaS", desc: "Plataforma escalável com assinaturas" },
        { value: "ecommerce", label: "E-commerce Enterprise", desc: "Loja virtual de alto tráfego" },
        { value: "app_mobile", label: "App Mobile", desc: "Aplicativo nativo ou híbrido" },
        { value: "api", label: "API / Integração", desc: "Desenvolvimento de conectores backend" },
    ],
    step2: [
        { value: "functional", label: "Nível Funcional", desc: "Foco puramente no código e nas regras." },
        { value: "professional", label: "Padrão de Mercado", desc: "Design limpo, responsivo e seguro." },
        { value: "premium", label: "Premium 77xp", desc: "Animações 3D, UX fluída, estado da arte." },
    ],
    step3: [
        { value: "mvp", label: "MVP (Start)", desc: "Primeira versão para testes rápido." },
        { value: "growth", label: "Growth / Escala", desc: "Sistema já operando que precisa evoluir." },
        { value: "enterprise", label: "Nível Enterprise", desc: "Arquitetura ultra segura e auditável." },
    ],
    step4: [
        { value: "basic", label: "Hospedagem Base", desc: "Servidores compartilhados tipo VPS." },
        { value: "cloud", label: "Cloud Nativa", desc: "Deploy em AWS/GCP (Docker)." },
        { value: "high_availability", label: "Alta Disponibilidade", desc: "Microsserviços, Auto-scaling, Zero-downtime." },
    ],
    step5: [
        { value: "no_rush", label: "Sem urgência", desc: "O foco é 100% qualidade e planejamento." },
        { value: "3_6_months", label: "3 a 6 meses", desc: "Ciclo de vida do projeto padrão." },
        { value: "urgent", label: "Urgente", desc: "Menos de 2 meses. Foco cirúrgico máximo." },
    ],
};

const MotionWrapper = ({ children, keyStr }: { children: React.ReactNode, keyStr: string }) => (
    <motion.div
        key={keyStr}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full flex-1 flex flex-col"
    >
        {children}
    </motion.div>
);

export function CalculatorWizard() {
    const { step, answers, setAnswer, nextStep, prevStep } = useCalculatorStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorLine, setErrorLine] = useState("");
    const totalSteps = 8; // Steps 1-5 choices, 6 text, 7 lead, 8 result

    const handleChoice = (key: keyof CalculatorAnswers, value: string) => {
        setAnswer(key, value);
        if (step < 5) {
            setTimeout(nextStep, 150); // Auto-advance for choices, visually smooth
        }
    };

    const submitLead = async () => {
        // Validações básicas da step 7
        if (!answers.leadName || !answers.leadEmail || !answers.leadEmail.includes("@")) {
            setErrorLine("Por favor, preencha nome e um e-mail válido.");
            return;
        }
        setErrorLine("");
        setIsSubmitting(true);

        const payload = formatCalculatorToLeadPayload(answers);

        try {
            const resp = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error("Falha no servidor");
            nextStep(); // Vai para o resultado (Step 8)
        } catch {
            setErrorLine("Ocourreu um erro ao gerar a estimativa. Tente novamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentProgress = (step / totalSteps) * 100;

    return (
        <div className="w-full max-w-4xl mx-auto min-h-[600px] bg-white/5 border border-white/10 rounded-3xl overflow-hidden glass shadow-2xl flex flex-col">
            {/* Progress Header */}
            {step < 8 && (
                <div className="w-full border-b border-white/10 p-6 flex flex-col gap-4 bg-black/40">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={prevStep} disabled={step === 1} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                <ArrowLeft size={18} />
                            </button>
                            <span className="text-white font-medium text-sm">Passo {step} de {totalSteps - 1}</span>
                        </div>
                        <Link href="/" className="text-sm text-[var(--color-primary)] hover:underline">Sair</Link>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${currentProgress}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 p-8 md:p-12 relative flex overflow-hidden">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <MotionWrapper keyStr="step1">
                            <h2 className="text-3xl font-bold text-white mb-2">O que você deseja construir?</h2>
                            <p className="text-white/60 mb-8">Nossa engenharia atende do micro ao macro. Qual o foco principal?</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {optionsData.step1.map(opt => (
                                    <button key={opt.value} onClick={() => handleChoice("projectType", opt.value)} className={`text-left p-6 rounded-2xl border transition-all duration-200 group ${answers.projectType === opt.value ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] shadow-[0_0_20px_rgba(124,77,255,0.15)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                        <div className="w-4 h-4 rounded-full border border-white/30 mb-4 flex items-center justify-center group-hover:border-[var(--color-primary)]">
                                            {answers.projectType === opt.value && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />}
                                        </div>
                                        <h3 className="text-lg font-semibold text-white mb-1">{opt.label}</h3>
                                        <p className="text-sm text-white/50">{opt.desc}</p>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button disabled={!answers.projectType} onClick={nextStep} className="gap-2">Avançar <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 2 && (
                        <MotionWrapper keyStr="step2">
                            <h2 className="text-3xl font-bold text-white mb-2">Qual o Nível de Design & UX esperado?</h2>
                            <p className="text-white/60 mb-8">Arquitetura robusta também exige frontends de elite.</p>
                            <div className="flex flex-col gap-4">
                                {optionsData.step2.map(opt => (
                                    <button key={opt.value} onClick={() => handleChoice("experienceLevel", opt.value)} className={`text-left p-6 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${answers.experienceLevel === opt.value ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-1">{opt.label}</h3>
                                            <p className="text-sm text-white/50">{opt.desc}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${answers.experienceLevel === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-white/30'}`}>
                                            {answers.experienceLevel === opt.value && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button disabled={!answers.experienceLevel} onClick={nextStep} className="gap-2">Avançar <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 3 && (
                        <MotionWrapper keyStr="step3">
                            <h2 className="text-3xl font-bold text-white mb-2">Nível de Complexidade de Sistemas</h2>
                            <p className="text-white/60 mb-8">A preparação do banco de dados ditará o futuro da empresa.</p>
                            <div className="flex flex-col gap-4">
                                {optionsData.step3.map(opt => (
                                    <button key={opt.value} onClick={() => handleChoice("complexity", opt.value)} className={`text-left p-6 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${answers.complexity === opt.value ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-1">{opt.label}</h3>
                                            <p className="text-sm text-white/50">{opt.desc}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${answers.complexity === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-white/30'}`}>
                                            {answers.complexity === opt.value && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button disabled={!answers.complexity} onClick={nextStep} className="gap-2">Avançar <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 4 && (
                        <MotionWrapper keyStr="step4">
                            <h2 className="text-3xl font-bold text-white mb-2">Qualidade de Infraestrutura</h2>
                            <p className="text-white/60 mb-8">Sistemas que caem não faturam.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {optionsData.step4.map(opt => (
                                    <button key={opt.value} onClick={() => handleChoice("infrastructure", opt.value)} className={`text-center p-6 rounded-2xl border transition-all duration-200 group flex flex-col items-center gap-4 ${answers.infrastructure === opt.value ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                        <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${answers.infrastructure === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-white/10 group-hover:bg-white/5'}`}>
                                            {answers.infrastructure === opt.value ? <CheckCircle2 size={24} className="text-white" /> : <Loader2 size={24} className="text-white/30 group-hover:text-white/60" />}
                                        </div>
                                        <div>
                                            <h3 className="text-md font-semibold text-white mb-1">{opt.label}</h3>
                                            <p className="text-xs text-white/50">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button disabled={!answers.infrastructure} onClick={nextStep} className="gap-2">Avançar <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 5 && (
                        <MotionWrapper keyStr="step5">
                            <h2 className="text-3xl font-bold text-white mb-2">Prazo e Exigência Temporal</h2>
                            <p className="text-white/60 mb-8">Times ágeis entregam rápido, mas segurança temporal é chave.</p>
                            <div className="flex flex-col gap-4">
                                {optionsData.step5.map(opt => (
                                    <button key={opt.value} onClick={() => handleChoice("deadline", opt.value)} className={`text-left p-6 rounded-2xl border transition-all duration-200 flex items-center justify-between group ${answers.deadline === opt.value ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]' : 'bg-black/20 border-white/10 hover:border-white/30 hover:bg-white/5'}`}>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-1">{opt.label}</h3>
                                            <p className="text-sm text-white/50">{opt.desc}</p>
                                        </div>
                                        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${answers.deadline === opt.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-white/30'}`}>
                                            {answers.deadline === opt.value && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button disabled={!answers.deadline} onClick={nextStep} className="gap-2">Avançar <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 6 && (
                        <MotionWrapper keyStr="step6">
                            <h2 className="text-3xl font-bold text-white mb-2">Detalhes Operacionais</h2>
                            <p className="text-white/60 mb-8">Tem algo específico, uma API obscura ou uma integração que deve notar? (Opcional)</p>
                            <div className="flex-1">
                                <textarea
                                    className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                                    placeholder="Nosso sistema atual é legado em PHP e precisamos interligar 2 bancos de dados..."
                                    value={answers.challengeDescription || ""}
                                    onChange={(e) => setAnswer("challengeDescription", e.target.value)}
                                />
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button onClick={nextStep} className="gap-2">Avançar para Cálculo <ChevronRight size={18} /></Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 7 && (
                        <MotionWrapper keyStr="step7">
                            <h2 className="text-3xl font-bold text-white mb-2">Para onde enviamos a arquitetura proposta?</h2>
                            <p className="text-white/60 mb-8">Nossos Tech Leads usarão as variáveis simuladas para formatar o escopo.</p>
                            <div className="flex flex-col gap-6 max-w-lg">
                                {errorLine && <p className="text-red-400 text-sm">{errorLine}</p>}

                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 uppercase tracking-widest pl-2">Nome Completo *</label>
                                    <input required value={answers.leadName || ""} onChange={e => setAnswer("leadName", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-[var(--color-primary)] focus:border-transparent outline-none" placeholder="Alan Turing" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 uppercase tracking-widest pl-2">E-mail Corporativo *</label>
                                    <input required type="email" value={answers.leadEmail || ""} onChange={e => setAnswer("leadEmail", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-[var(--color-primary)] focus:border-transparent outline-none" placeholder="alan@empresa.com" />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-white/50 uppercase tracking-widest pl-2">Empresa (Opcional)</label>
                                    <input value={answers.leadCompany || ""} onChange={e => setAnswer("leadCompany", e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:ring-[var(--color-primary)] focus:border-transparent outline-none" placeholder="Turing Machines" />
                                </div>
                            </div>
                            <div className="mt-auto pt-8 flex justify-end">
                                <Button size="lg" disabled={isSubmitting} onClick={submitLead} className="gap-2">
                                    {isSubmitting ? "Processando Algoritmo..." : "Gerar Estimativa Arquitetural"}
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                </Button>
                            </div>
                        </MotionWrapper>
                    )}

                    {step === 8 && (
                        <MotionWrapper keyStr="step8">
                            <div className="flex flex-col items-center justify-center text-center py-12">
                                <div className="w-24 h-24 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)] flex items-center justify-center mb-8 relative">
                                    <div className="absolute inset-0 bg-[var(--color-primary)] blur-3xl opacity-30 rounded-full animate-pulse" />
                                    <CheckCircle2 size={48} className="text-[var(--color-primary)] relative z-10" />
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-4">Estimativa Concluída</h2>
                                <p className="text-xl text-white/60 mb-12 max-w-2xl">Os resultados preliminares da nossa simulação arquitetural apontam a seguinte estrutura para sua demanda:</p>

                                <div className="w-full max-w-2xl bg-black/50 border border-white/10 rounded-3xl p-8 text-left mb-12 backdrop-blur-xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-xs text-[var(--color-primary)] font-bold tracking-widest uppercase mb-1">Perfil do Sistema</p>
                                            <p className="text-lg text-white font-medium">{calculateEstimation(answers).profile}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-[var(--color-primary)] font-bold tracking-widest uppercase mb-1">Padrão Arquitetural</p>
                                            <p className="text-lg text-white font-medium">{calculateEstimation(answers).architecture}</p>
                                        </div>
                                        <div className="md:col-span-2 pt-6 border-t border-white/10">
                                            <p className="text-xs text-white/40 font-medium uppercase tracking-widest mb-2 flex items-center gap-2">
                                                <AlertCircle size={14} /> Intervalo Estimado (Orçamento Preliminar)
                                            </p>
                                            <p className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-500">
                                                {calculateEstimation(answers).range}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-white/40 max-w-xl mb-8">
                                    Isso é uma precisão de nossa Engine baseada em variáveis de complexidade. Nossa engenharia, de fato, entrou em contato com você pelo e-mail fornecido para cravar a Discovery Final.
                                </p>

                                <Link href="/">
                                    <Button variant="outline">Voltar à Página Principal</Button>
                                </Link>
                            </div>
                        </MotionWrapper>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
