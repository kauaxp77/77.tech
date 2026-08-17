import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronRight, Calculator } from "lucide-react";

export default async function ProposalPage({ params }: { params: { id: string } }) {
    // 1. Instanciar Supabase Server 
    const supabase = await createClient();
    const { data: lead, error } = await supabase.from("leads").select("*").eq("id", params.id).single();

    if (error || !lead) {
        return notFound();
    }

    // 2. Mocking Valores Estimados de Custos baseados no Project Type
    let estimatedCost = 3500;
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
        <div className="min-h-screen bg-black/50 py-10 print:bg-white print:py-0">
            {/* Controller HUD (Escondido no PDF) */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md">
                <div>
                    <h2 className="text-white font-bold">Proposta Comercial Gerada</h2>
                    <p className="text-white/50 text-sm">Pronta para envio ou exportação PDF.</p>
                </div>
                <button
                    onClick="window.print()"
                    className="bg-emerald-500 text-black px-6 py-2.5 rounded-full font-bold select-none cursor-pointer"
                >
                    Salvar Arquivo PDF
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-16 shadow-2xl relative text-slate-800 print:shadow-none print:m-0">

                {/* Header Timbrado */}
                <header className="flex justify-between items-start mb-20 pb-10 border-b-2 border-slate-100">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">77xp Tech Solutions</h1>
                        <p className="text-slate-500 font-medium">Arquitetura de Software de Alta Performance.</p>
                    </div>
                    <div className="text-right text-sm text-slate-500 space-y-1">
                        <p>PROPOSTA N°: #{String(Math.floor(Math.random() * 10000)).padStart(5, '0')}</p>
                        <p>DATA: {new Date().toLocaleDateString('pt-BR')}</p>
                        <p>VALIDADE: 15 dias</p>
                    </div>
                </header>

                <div className="space-y-12">
                    {/* Apresentação Alvo */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-blue-600 mb-2">Apresentado Para</h2>
                        <h3 className="text-2xl font-bold text-slate-900">{lead.name}</h3>
                        {lead.company && <p className="text-slate-600 font-medium">{lead.company}</p>}
                        <p className="text-slate-500 text-sm mt-1">{lead.email}</p>
                    </section>

                    {/* Escopo Analisado */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-blue-600 mb-4">Escopo do Projeto ({lead.project_type})</h2>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <p className="text-slate-700 italic leading-relaxed">
                                "{lead.message}"
                            </p>
                        </div>
                    </section>

                    {/* Timeline & Metodologia */}
                    <section>
                        <h2 className="uppercase tracking-widest text-xs font-bold text-blue-600 mb-4">Metodologia de Entrega</h2>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                "Design System & Prototipagem Figma",
                                "Desenvolvimento React.js / Next.js",
                                "API e Banco de Dados Supabase",
                                `Entrega em até ${deadlineWeeks}`
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-lg">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    <span className="font-medium text-sm">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Investimento Estimado */}
                    <section className="pt-8">
                        <h2 className="uppercase tracking-widest text-xs font-bold text-blue-600 mb-4 flex items-center gap-2"><Calculator size={16} /> Estimativa de Investimento</h2>

                        <div className="border-2 border-slate-900 rounded-3xl p-8 mb-4">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900">Desenvolvimento Full-Stack</h4>
                                    <p className="text-slate-500 text-sm">Direitos de Código + Handover</p>
                                </div>
                                <span className="text-3xl font-black text-slate-900">
                                    R$ {estimatedCost.toLocaleString('pt-BR')},00
                                </span>
                            </div>

                            <p className="text-xs text-slate-400 font-medium">* O valor acima é uma estimativa superficial baseada no escopo fornecido. A formalização passará por Discovery técnico.</p>
                        </div>
                    </section>
                </div>

                {/* Footer Document */}
                <div className="absolute bottom-16 left-16 right-16 pt-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <p>Wendeson Kaua — Diretor de Tecnologia</p>
                    <p>77.tech</p>
                </div>

            </div>

            {/* Hack Script for Print to PDF native behavior */}
            <script dangerouslySetInnerHTML={{
                __html: `
                    document.querySelector("button").addEventListener("click", () => window.print());
                `
            }} />
        </div>
    )
}
