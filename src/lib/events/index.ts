import { EventBus } from "./EventBus";

// Import Hooks/Dependencies if needed
import { Resend } from "resend";
import { LeadNotificationEmail } from "@/emails/LeadNotification";

// -------------------------------------------------------------------------------- //
// REGISTRO GLOBAL DE AUTOMAÇÕES BASEADAS EM EVENTO                                 //
// Centraliza toda lógica de side-effect (Email, Webhooks, AI) retirando do DB.     //
// -------------------------------------------------------------------------------- //

EventBus.on('lead.created', async (lead) => {
    // Essa lógica estava antes espremida de forma impura dentro do backend
    // Agora é um side-effect assíncrono perfeitamente escalável.

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

// A base do Webhook Discord que usaremos na Sprint 7B já é esperada aqui:
EventBus.on('lead.created', async (lead) => {
    console.log("[EventBus -> Discord] Webhooks serãom despachados por esta Worker futuramente.");
});

// Outro Evento Vital: Atualização de Status
EventBus.on('lead.stage_changed', async (payload) => {
    console.log(`[EventBus] Status alterado do Lead [${payload.leadId}] para -> ${payload.newStatus}`);
    // Futuro: Registrar auditoria de SLA, Notificar dono do Lead.
});

// Forçar a execução na Edge
export { EventBus };
