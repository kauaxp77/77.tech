import { EventBus } from "./EventBus";

// Import Hooks/Dependencies if needed
import { Resend } from "resend";
import { LeadNotificationEmail } from "@/emails/LeadNotification";
import { preQualifyLeadAI } from "@/lib/ai/qualifier";

// -------------------------------------------------------------------------------- //
// REGISTRO GLOBAL DE AUTOMAÇÕES BASEADAS EM EVENTO                                 //
// Centraliza toda lógica de side-effect (Email, Webhooks, AI) retirando do DB.     //
// -------------------------------------------------------------------------------- //

EventBus.on('lead.created', async (lead) => {
    // Essa lógica estava antes espremida de forma impura dentro do backend
    // Agora é um side-effect assíncrono perfeitamente escalável.

    // -> 0. [SPRINT 7G] Análise Sintagmática Oculta de Leads AI
    await preQualifyLeadAI(lead);

    // 1. Notificação Tradicional (Resend)
    const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (resendClient && process.env.COMPANY_ALERT_EMAIL) {
        await resendClient.emails.send({
            from: "77xp Systems <onboarding@resend.dev>", // O provedor atual verificado da Resend
            to: [process.env.COMPANY_ALERT_EMAIL],
            subject: `[Event Bus] Novo Lead: ${lead.name}`,
            react: LeadNotificationEmail({ lead }),
        });
        console.log("[EventBus -> Resend] Email enviado silenciosamente.");
    }
});

// Integradora Sever-less robusta de Webhooks para Discord
EventBus.on('lead.created', async (lead) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("[EventBus -> Discord] DISCORD_WEBHOOK_URL não configurada no painel da Vercel. Pulando disparo.");
        return;
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: null,
                embeds: [{
                    title: `🚀 NOVO LEAD ENTRANDO NO FUNIL PELA ${lead.source || 'ORGÂNICO'}`,
                    color: 3447003,
                    fields: [
                        { name: "👤 Nome / Cliente", value: lead.name, inline: true },
                        { name: "🏢 Empresa", value: lead.company || "Pessoa Física", inline: true },
                        { name: "🛠 Escopo", value: lead.project_type || "Geral", inline: false },
                        { name: "🔥 Inteligência (P)", value: `Prioridade Mapeada: ${lead.priority}`, inline: true }
                    ],
                    footer: { text: "Gerado pela 77xp Operations Master Engine" },
                    timestamp: new Date().toISOString()
                }]
            })
        });
        console.log("[EventBus -> Discord] Sinal Webhook despachado com alerta sonoro para a equipe.");
    } catch (err: any) {
        console.error("Falha ao entregar carga útil para infraestrutura Discord:", err.message);
    }
});

// Outro Evento Vital: Atualização de Status
EventBus.on('lead.stage_changed', async (payload) => {
    console.log(`[EventBus] Status alterado do Lead [${payload.leadId}] para -> ${payload.newStatus}`);
    // Futuro: Registrar auditoria de SLA, Notificar dono do Lead.
});

// ICEBREAKER ALERTS: Stagnation Detection -> Discord Alert
EventBus.on('lead.stagnated', async (lead) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "⚠️ **ALERTA DE ICEBREAKER** <@&HERE>",
                embeds: [{
                    title: `🚨 LEAD ESTAGNADO HÁ MAIS DE 5 DIAS`,
                    description: "Este prospect está esfriando violentamente na etapa NEGOCIAÇÃO. Exigido follow-up imediato do comercial.",
                    color: 15548997, // Laranja
                    fields: [
                        { name: "👤 Cliente / Empresa", value: `${lead.name} (${lead.company || 'PF'})`, inline: true },
                        { name: "💰 Pipeline Ponderado", value: `R$ ${(lead.estimated_value || 0).toLocaleString('pt-BR')}`, inline: true }
                    ],
                    footer: { text: "System Automation: EventBus Stagnation Detector" }
                }]
            })
        });
    } catch (err: any) {
        console.error("Falha no alerta de estagnação Discord:", err.message);
    }
});

// DEAL WON ALERTS: Stripe Checkout -> Discord Alarm (Gong!)
EventBus.on('deal.won', async (payload: { leadId: string, amountTotal: number | null, currency: string | null }) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "🎉 **NOVO NEGÓCIO FECHADO! PINGOU NA CONTA!** <@&HERE>",
                embeds: [{
                    title: `💸 DEAL WON - PAGAMENTO STRIPE APROVADO`,
                    description: "O cliente acabou de bater o cartão/pix na plataforma de Propostas! O Lead foi movido para FECHADO automaticamente.",
                    color: 3066993, // Verde Escuro
                    fields: [
                        { name: "🔗 ID Referência", value: payload.leadId, inline: true },
                        { name: "🏦 Receita Direta", value: payload.amountTotal ? `R$ ${(payload.amountTotal / 100).toLocaleString('pt-BR')}` : "N/A", inline: true }
                    ],
                    thumbnail: { url: "https://i.imgur.com/8Q3E29v.png" }, // Dinheiro Icon
                    footer: { text: "System Automation: EventBus Payment Webhook" }
                }]
            })
        });
    } catch (err: any) {
        console.error("Falha no alerta de pagamento Discord:", err.message);
    }
});

// Forçar a execução na Edge
export { EventBus };
