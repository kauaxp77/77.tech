import { Lead } from "@/schemas/lead";
import { LeadRepository } from "@/repositories/leadRepository";
import { Resend } from "resend";
import { LeadNotificationEmail } from "@/emails/LeadNotification";

const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export class LeadService {
    static async processNewLead(lead: Lead): Promise<void> {
        // 1. Data Preservation (Tolerance focus)
        await LeadRepository.createLead(lead);

        // 2. Communication Action
        if (resendClient && process.env.COMPANY_ALERT_EMAIL) {
            try {
                await resendClient.emails.send({
                    from: "77xp Systems <onboarding@resend.dev>",
                    to: [process.env.COMPANY_ALERT_EMAIL],
                    subject: `🎯 Novo Lead Capturado: ${lead.name} da empresa ${lead.company || "Independente"}`,
                    react: LeadNotificationEmail({ lead }),
                });
            } catch (err) {
                console.error("Email Transactional Engine Error:", err);
                // Do not throw to avoid failing the user request if saving to DB succeeded.
            }
        } else {
            console.warn("[MOCK] Emails missing API KEYS. Silent mode active.");
        }
    }
}
