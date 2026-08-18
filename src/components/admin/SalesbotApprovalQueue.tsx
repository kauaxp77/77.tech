"use client";

import { useState } from "react";
import { Bot, CheckCircle, Copy, Loader2, Sparkles } from "lucide-react";
import { BaseLead } from "./KanbanBoard";

export function SalesbotApprovalQueue({ lead }: { lead: BaseLead }) {
    const [draft, setDraft] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateMagicCopy = () => {
        setIsGenerating(true);
        // Heurística B2B Simulando IA Generativa Avançada
        setTimeout(() => {
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
            setIsGenerating(false);
        }, 1500); // Mimetiza o delay de IA (1.5s)
    };

    const handleCopy = () => {
        if (!draft) return;
        navigator.clipboard.writeText(draft);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="bg-indigo-950/20 border-l-[3px] border-indigo-500/50 p-5 rounded-r-2xl mb-8 relative group w-full">
            <h3 className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-3 flex items-center gap-2">
                <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''} /> Salesbot Autopilot Mode
            </h3>

            {!draft && !isGenerating && (
                <button
                    onClick={generateMagicCopy}
                    className="w-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-100 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-500/30 hover:border-indigo-400"
                >
                    <Bot size={14} />
                    {lead.status === 'NEGOCIACAO' ? 'Gerar Copy de Quebra de Objeção via IA' : 'Comandar Salesbot: Rascunhar E-mail de Conversão'}
                </button>
            )}

            {isGenerating && (
                <div className="flex flex-col items-center justify-center py-6">
                    <div className="relative">
                        <div className="h-10 w-10 border-2 border-indigo-500 rounded-full animate-ping opacity-20 absolute" />
                        <Loader2 size={40} className="text-indigo-400 animate-spin" />
                    </div>
                    <p className="text-xs text-indigo-300 mt-4 animate-pulse uppercase tracking-widest font-bold">Lendo Score e Contexto B2B...</p>
                </div>
            )}

            {draft && (
                <div className="space-y-3 animate-fade-in-up">
                    <p className="text-[10px] text-indigo-300/60 leading-tight">Fila de Aprovação Humana: Edite o texto abaixo se necessário e confirme o disparo (SDR Oversight).</p>
                    <textarea
                        className="w-full h-40 bg-black/60 border border-indigo-500/30 rounded-xl p-4 text-sm text-white/90 focus:outline-none focus:border-indigo-400 font-mono leading-relaxed resize-none shadow-inner"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                    />

                    <button
                        onClick={handleCopy}
                        className={`w-full text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl ${copied ? 'bg-emerald-500 text-black border-none' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400'}`}
                    >
                        {copied ? <><CheckCircle size={14} /> Copiado para Transferência! Cole no WhatsApp/Email</> : <><Copy size={14} /> Aprovar Disparo (Copiar)</>}
                    </button>
                </div>
            )}
        </div>
    );
}
