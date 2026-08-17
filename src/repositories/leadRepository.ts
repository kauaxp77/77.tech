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
            console.warn("[MOCK] Supabase vars not found. Lead safely captured:", lead);
            return;
        }

        const { error } = await supabase.from("leads").insert([
            {
                name: lead.name,
                email: lead.email,
                company: lead.company,
                phone: lead.phone,
                project_type: lead.projectType,
                message: lead.message,
                source: lead.source,
            },
        ]);

        if (error) {
            console.error("Supabase Registration Error:", error.message);
            throw new Error("Database persistence failed.");
        }
    }
}
