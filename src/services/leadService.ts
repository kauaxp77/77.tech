import { Lead } from "@/schemas/lead";
import { LeadRepository } from "@/repositories/leadRepository";
import { EventBus } from "@/lib/events";

export class LeadService {
    static async processNewLead(lead: Lead): Promise<void> {
        // 1. Data Preservation (Persistence Focus)
        await LeadRepository.createLead(lead);

        // 2. Assynchronous Distribution Action via Event Bus
        // All communication (Emails, Discord Webhooks, WhatsApp automations) 
        // decoupled to avoid blocking the user API response!
        await EventBus.emit('lead.created', lead);
    }
}
