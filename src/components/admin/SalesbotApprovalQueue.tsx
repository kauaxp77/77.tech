"use client";

import { useState } from "react";
import { Bot, CheckCircle, Copy, Loader2, Sparkles, TerminalSquare, MailOpen } from "lucide-react";
import { BaseLead } from "./KanbanBoard";

export function SalesbotApprovalQueue({ lead }: { lead: BaseLead }) {
    const [activeTab, setActiveTab] = useState<'email' | 'prompt'>('email');
    const [draft, setDraft] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateMagicCopy = () => {
        setIsGenerating(true);
        setTimeout(() => {
            if (activeTab === 'email') {
                const urgency = (lead.score || 0) >= 70 ? "alta" : "média";
                const greeting = `Olá ${lead.name.split(' ')[0]}, tudo bem?`;
                const discovery = lead.status === 'ENVIADO'
                    ? `Vi que você solicitou nosso projeto de Engenharia de Software. Com base no seu escopo (${lead.project_type || 'Tech'}), sabemos que projetos desse segmento exigem uma arquitetura escalável e segurança reforçada.`
                    : `Estou acompanhando seu perfil no nosso CRM e vi o interesse no desenvolvimento focado em ${lead.project_type || 'Software/Web'}.`;
                const pitch = (lead.score || 0) >= 80
                    ? `Notei pelo seu mapeamento que sua prioridade é máxima. Nós já ajudamos várias empresas do nicho de ${lead.company || 'Startups e SaaS'} a destravarem faturamentos altíssimos com sistemas bem orquestrados.`
                    : `Acredito genuinamente que nossa fábrica pode ser o parceiro tecnológico exato que sua empresa (${lead.company || 'Startups e SaaS'}) precisa agora.`;
                const cta = lead.status === 'NEGOCIACAO'
                    ? `Vamos fazer uma rápida call de 15 min amanhã à tarde pra bater o martelo e alinhar os próximos passos? Sem compromisso, só pra você ver a robustez do que idealizamos.`
                    : `Consegue liberar uns 15 minutinhos amanhã pra eu te mostrar um protótipo ou um case similar que resolve exatamente suas dores?`;

                const finalDraft = `${greeting}\n\n${discovery} ${pitch}\n\n${cta}\n\nAbs,\nEquipe de Especialistas 77xp`;
                setDraft(finalDraft);
            } else {
                // Prompt Blueprint Tab
                const blueprint = `ATUE COMO UM ENGENHEIRO DE SOFTWARE SÊNIOR E ARQUITETO DE SOLUÇÕES (CTO).

O cliente se chama ${lead.name} da empresa ${lead.company || 'Confidencial'}.
Eles precisam construir um sistema focado na vertical B2B com as seguintes métricas de entrada:
- Orçamento Estimado: R$ ${lead.estimated_value || 'Não informado'}
- Tipo da Solução: ${lead.project_type || 'Plataforma SaaS customizada'}
- Pontuação de Maturidade Tecnológica (Lead Score): ${lead.score || 0}/100

Sua Tarefa (Requisitos do Blueprint do Projeto):
1. Defina a Stack Tecnológica Ideal e justifique (Leve em conta o ecossistema Next.js, Node ou Java Sprint Boot, PostgreSQL e hospedagem Severless Vercel).
2. Escreva o Modelo de Dados (Entity Relationship) inicial essencial para suportar o core business desse sistema.
3. Elabore um roadmap sugerido de Sprints para um MVP de 4 Semanas.
4. Sinalize os principais desafios de segurança (ex: RLS, Autenticação) para a vertical desse cliente.

Formate tudo de maneira visual em Markdown para repassarmos no kick-off.`;
                setDraft(blueprint);
            }
            setIsGenerating(false);
        }, 1500);
    };

    const handleCopy = () => {
        if (!draft) return;
        navigator.clipboard.writeText(draft);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    // Reset draft on tab change
    const switchTab = (tab: 'email' | 'prompt') => {
        setActiveTab(tab);
        setDraft(null);
        setCopied(false);
        setIsGenerating(false);
    }

    return (
        <div className="bg-indigo-950/20 border-l-[3px] border-indigo-500/50 p-5 rounded-r-2xl mb-8 relative group w-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold flex items-center gap-2">
                    <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} /> Salesbot Autopilot Mode
                </h3>
            </div>

            {/* TAB SELECTOR */}
            <div className="flex p-1 bg-black/40 rounded-xl mb-4 border border-indigo-500/20">
                <button
                    onClick={() => switchTab('email')}
                    className={`flex-1 text-[10px] uppercase font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'email' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-300'}`}
                >
                    <MailOpen size={12} /> E-mail Sales Copy
                </button>
                <button
                    onClick={() => switchTab('prompt')}
                    className={`flex-1 text-[10px] uppercase font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'prompt' ? 'bg-fuchsia-600/80 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-300'}`}
                >
                    <TerminalSquare size={12} /> Engenharia (Prompt)
                </button>
            </div>

            {!draft && !isGenerating && (
                <button
                    onClick={generateMagicCopy}
                    className={`w-full text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border ${activeTab === 'email' ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-100 border-indigo-500/30 hover:border-indigo-400' : 'bg-fuchsia-600/20 hover:bg-fuchsia-600/40 text-fuchsia-200 border-fuchsia-500/30 hover:border-fuchsia-400'}`}
                >
                    {activeTab === 'email' ? <Bot size={14} /> : <TerminalSquare size={14} />}
                    {activeTab === 'email' ? 'Gerar E-mail de Abordagem para Fechamento' : 'Pré-Moldar Arquitetura do Sistema (Blueprint Prompt)'}
                </button>
            )}

            {isGenerating && (
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative">
                        <div className={`h-10 w-10 border-2 rounded-full animate-ping opacity-20 absolute ${activeTab === 'email' ? 'border-indigo-500' : 'border-fuchsia-500'}`} />
                        <Loader2 size={40} className={`animate-spin ${activeTab === 'email' ? 'text-indigo-400' : 'text-fuchsia-400'}`} />
                    </div>
                    <p className={`text-xs mt-4 animate-pulse uppercase tracking-widest font-bold ${activeTab === 'email' ? 'text-indigo-300' : 'text-fuchsia-300'}`}>
                        {activeTab === 'email' ? 'Escrevendo Copy de Vendas...' : 'Engenharia Reversa: Modelando Prompt...'}
                    </p>
                </div>
            )}

            {draft && (
                <div className="space-y-3 animate-fade-in-up">
                    <p className="text-[10px] text-white/50 leading-tight">
                        {activeTab === 'email' ? 'Fila Humana: Edite e aprove o disparo estratégico.' : 'Prompt de Pré-Moldagem gerado. Copie e cole na sua IA de Engenharia favorita (Cursor / ChatGPT / Gemini) para gerar a Stack do cliente.'}
                    </p>
                    <textarea
                        className={`w-full h-56 bg-black/80 border rounded-xl p-4 text-sm focus:outline-none font-mono leading-relaxed resize-none shadow-inner ${activeTab === 'email' ? 'text-indigo-100 border-indigo-500/30 focus:border-indigo-400' : 'text-fuchsia-100 border-fuchsia-500/30 focus:border-fuchsia-400'}`}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />

                    <button
                        onClick={handleCopy}
                        className={`w-full text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl ${copied ? 'bg-emerald-500 text-black border-none' : (activeTab === 'email' ? 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white border border-fuchsia-400')}`}
                    >
                        {copied ? <><CheckCircle size={14} /> Copiado para a Área de Transferência!</> : <><Copy size={14} /> {activeTab === 'email' ? 'Aprovar Disparo (Copiar E-mail)' : 'Copiar Prompt Master'}</>}
                    </button>
                </div>
            )}
        </div>
    );
}
