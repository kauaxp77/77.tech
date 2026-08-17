import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle2, Calculator, Settings2, Code, ShieldCheck } from "lucide-react";
import { PrintButton } from "@/components/admin/PrintButton";

export default async function ProposalPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", params.id).single();

    if (error || !lead) return notFound();

    // Precificação Oficial (Heurísticas Base 77xp)
    let estimatedCost = 4000;
    let deadlineWeeks = "4 a 6 Semanas";
    if (lead.project_type?.includes("Sistemas") || lead.project_type?.includes("SaaS")) {
        estimatedCost = 15000;
        deadlineWeeks = "10 a 16 Semanas";
    } else if (lead.project_type?.includes("E-commerce")) {
        estimatedCost = 7500;
        deadlineWeeks = "8 a 10 Semanas";
    } else if (lead.project_type?.includes("Landing")) {
        estimatedCost = 2500;
        deadlineWeeks = "2 a 3 Semanas";
    }

    return (
        <div className="min-h-screen bg-neutral-900 py-10 print:bg-white print:py-0 font-sans">
            {/* Controller HUD (Escondido no PDF) */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
                <div>
                    <h2 className="text-white font-bold">Proposta Comercial [Padrão 77XP]</h2>
                    <p className="text-white/50 text-sm">Design otimizado formato A4. Pressione Baixar e salve como PDF.</p>
                </div>
                <PrintButton />
            </div>

            {/* A4 Paper Container - 100% Branco Imaculado na Impressão */}
            <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-2xl relative text-neutral-900 print:shadow-none print:m-0 print:p-[10mm]">

                {/* Header Timbrado Oficial */}
                <header className="flex justify-between items-center mb-16 pb-8 border-b-2 border-neutral-100">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-neutral-900">77XP<span className="text-emerald-500">.TECH</span></h1>
                        <p className="text-neutral-500 font-medium text-sm tracking-widest uppercase mt-1">Software Engenharia & B2B Solutions</p>
                    </div>
                    <div className="text-right text-xs text-neutral-500 space-y-1 font-mono">
                        <p className="font-bold text-neutral-900">PROPOSTA C-LEVEL</p>
                        <p>DOC ID: #{String(Math.floor(Math.random() * 10000)).padStart(5, '0')}</p>
                        <p>DATA: {new Date().toLocaleDateString('pt-BR')}</p>
                        <p>VALIDADE: 15 dias</p>
                    </div>
                </header>

                <div className="space-y-10">
                    {/* Apresentação Alvo */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-emerald-600 mb-2 border-l-4 border-emerald-500 pl-3">Apresentado Para</h2>
                        <div className="pl-4">
                            <h3 className="text-3xl font-black text-neutral-900">{lead.name}</h3>
                            <p className="text-neutral-600 font-medium text-lg">{lead.company || "Pessoa Física / Empreendimento Independente"}</p>
                            <p className="text-neutral-400 text-sm mt-1">{lead.email}</p>
                        </div>
                    </section>

                    {/* Escopo Analisado */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-emerald-600 mb-4 border-l-4 border-emerald-500 pl-3">Diagnóstico Técnico ({lead.project_type})</h2>
                        <div className="bg-neutral-50/50 p-6 rounded-2xl border border-neutral-100">
                            <p className="text-neutral-700 leading-relaxed italic border-l-2 border-neutral-300 pl-4">
                                "{lead.message || "Solicitação de contato via calculadora da plataforma."}"
                            </p>
                            <p className="text-sm mt-4 text-neutral-500 font-medium tracking-wide">
                                **Nota da Engenharia:** Baseado nas tratativas extraídas, o projeto será desenhado com foco em Alta Escalabilidade e Perfomance (High-End).
                            </p>
                        </div>
                    </section>

                    {/* Escopo de Trabalho & Ferramentas */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-emerald-600 mb-4 border-l-4 border-emerald-500 pl-3">Plano de Execução (Roadmap)</h2>
                        <div className="grid grid-cols-2 gap-6 pl-4">
                            <div className="flex gap-4">
                                <div className="mt-1"><Settings2 className="text-emerald-500" size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">1. Discovery & UI/UX</h4>
                                    <p className="text-sm text-neutral-500">Mapeamento da Jornada do Usuário (Figma).</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1"><Code className="text-emerald-500" size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">2. Code & Engenharia</h4>
                                    <p className="text-sm text-neutral-500">Next.js 14, Arquitetura Serverless Rápida.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1"><ShieldCheck className="text-emerald-500" size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">3. Banco de Dados</h4>
                                    <p className="text-sm text-neutral-500">Relational DB Supabase + Security Rules.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1"><CheckCircle2 className="text-emerald-500" size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-neutral-900">4. Entrega Bruta</h4>
                                    <p className="text-sm text-neutral-500">Deploy Global Vercel ({deadlineWeeks}).</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Investimento Estimado */}
                    <section className="pt-6">
                        <h2 className="uppercase tracking-widest text-xs font-bold text-emerald-600 mb-4 flex items-center gap-2"><Calculator size={16} /> Estimativa de Investimento C-Level</h2>

                        <div className="bg-neutral-900 rounded-3xl p-8 mb-4 shadow-xl">
                            <div className="flex justify-between items-center text-white">
                                <div>
                                    <h4 className="font-bold text-xl">Arquitetura de Software Total</h4>
                                    <p className="text-neutral-400 text-sm">Handover Completo (+ Propriedade do Código-Fonte)</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-4xl font-black text-emerald-400">
                                        R$ {estimatedCost.toLocaleString('pt-BR')},00
                                    </span>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-neutral-400 font-medium text-center">* O valor expresso é referencial para tomada de decisão (Baseado em Heurística Tecnológica). A assinatura envolverá contrato formal com escopo travado e fracionamento de parcelas ajustáveis perante Prazos.</p>
                    </section>

                </div>

                {/* Footer Assinatura e Dados Finais */}
                <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] flex pt-8 border-t-2 border-neutral-100 justify-between items-end">
                    <div>
                        <h4 className="font-black text-neutral-900 text-lg">Wendeson Kaua</h4>
                        <p className="text-sm text-neutral-500 font-medium">Head of Engineering / CEO</p>
                        <p className="text-xs text-neutral-400">hi@77.tech | +55 61 9999-9999</p>
                    </div>
                    <div className="text-right">
                        <img src="https://i.imgur.com/K5b9M47.png" alt="77xp Signature" className="h-8 opacity-20 invert print:invert-0 ml-auto" />
                    </div>
                </div>

            </div>
        </div>
    )
}
