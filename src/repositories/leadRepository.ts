import { createClient } from "@supabase/supabase-js";
import { Lead } from "@/schemas/lead";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only construct client if valid HTTP variables are given to avoid build crashes
const hasRealDb = supabaseUrl && supabaseUrl.startsWith("http") && supabaseKey;
const supabase = hasRealDb ? createClient(supabaseUrl, supabaseKey) : null;

export class LeadRepository {
    static async createLead(lead: Lead): Promise<void> {
        if (!supabase) {
            console.warn("[MOCK] Supabase vars not found. Lead safely captured.");
            return;
        }

        let isDuplicate = false;
        try {
            // Deduplication Check
            const { data: existing } = await supabase
                .from("leads")
                .select("id")
                .or(`email.eq.${lead.email},phone.eq.${lead.phone}`)
                .limit(1);
            if (existing && existing.length > 0) isDuplicate = true;
        } catch (e) {
            console.warn("Dedupe check failed non-fatally", e);
        }

        // Lead Scoring Engine (Sprint 7A)
        let score = 0;
        const typeMap: Record<string, number> = {
            'Website Escalonável': 30,
            'Sistemas B2B/B2C (SaaS)': 80,
            'Landing Page Conversão': 20
        };
        score += typeMap[lead.projectType || ''] || 20;

        if (lead.company && lead.company.length > 2) score += 25;
        if (lead.message && lead.message.length > 50) score += 10;
        if (lead.message && lead.message.length > 150) score += 15;
        if (isDuplicate) score += 10; // Recurrent intent

        let priority = 'BAIXA';
        if (score >= 70) priority = 'ALTA';
        else if (score >= 40) priority = 'MEDIA';

        // SLA Deadline: 2 Business Hours
        const slaDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

        const { error } = await supabase.from("leads").insert([
            {
                name: isDuplicate ? `⚠️ [RECORRENTE] ${lead.name}` : lead.name,
                email: lead.email,
                company: lead.company,
                phone: lead.phone,
                project_type: lead.projectType,
                message: lead.message,
                source: lead.source || 'Orgânico',
                score: Math.min(score, 100),
                priority: priority,
                sla_deadline: slaDeadline
            },
        ]);

        if (error) {
            console.error("Supabase Registration Error:", error.message);
            throw new Error("Database persistence failed.");
        }
    }
}
