import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { BaseLead } from "@/components/admin/KanbanBoard";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Reutilizar configs locais puras via string para rodar perfeitamente como worker edge/node sem conflitar imports
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function preQualifyLeadAI(lead: BaseLead) {
    if (!openai) {
        console.warn("[AI Qualifier] OPENAI_API_KEY faltando no arquivo .env. Avaliação por IA Desativada.");
        return;
    }

    try {
        console.log(`[AI Qualifier] Pensando sobre as dores do Lead: ${lead.name}...`);
        const prompt = `
            Você é um Consultor de Vendas B2B experiente de uma Agência de Software Premium (77xp tech).
            Analise a forma de escrita e as entrelinhas da mensagem capturada do cliente para determinar a maturidade real dele para investir num software High-End.
            
            Dados Extraídos:
            - Cliente: ${lead.name}
            - Escopo Assinalado: ${lead.project_type}
            - Mensagem Original: "${lead.message}"

            Seja implacável, inteligente e analítico. Escreva um diagnóstico brutalmente honesto.
            Retorne APENAS um JSON válido estritamente no formato:
            {
                "score_maturidade": numero inteiro de 0 a 100,
                "diagnostico_curto": "Uma linha agressiva e técnica sobre a intenção real dele e a chance de fechamento."
            }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Rapid intelligence
            messages: [{ role: "system", content: prompt }],
            response_format: { type: "json_object" }
        });

        const resultStr = response.choices[0].message.content;
        if (!resultStr) return;

        const aiAnalysis = JSON.parse(resultStr);

        // Formata injeção invisivelmente para não quebrar tabelas, prependendo a análise ao corpo
        const newMsg = `🤖 [ANÁLISE GPT] Maturidade: ${aiAnalysis.score_maturidade}/100\nDiagnóstico: ${aiAnalysis.diagnostico_curto}\n\n========================\n"${lead.message}"`;

        const newScore = Math.min((lead.score || 0) + Math.round(aiAnalysis.score_maturidade * 0.3), 100);

        const { error } = await supabase.from('leads').update({
            message: newMsg,
            score: newScore
        }).eq('id', lead.id);

        if (error) {
            console.error("[AI] Falha ao persistir injeção AI no banco:", error.message);
            return;
        }

        console.log(`[AI Qualifier] Genialidade Injetada com Sucesso para [${lead.name}]. Score AI base: ${aiAnalysis.score_maturidade}`);

    } catch (e: any) {
        console.error("[AI Qualifier] Erro semântico de API:", e.message);
    }
}
