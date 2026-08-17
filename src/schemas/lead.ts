import { z } from "zod";

export const LeadSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    email: z.string().email("Por favor, insira um e-mail corporativo ou válido."),
    company: z.string().optional(),
    phone: z.string().optional(),
    projectType: z.enum(["saas", "landing_page", "api", "infra", "other", ""]).optional(),
    message: z.string().min(10, "A mensagem deve conter pelo menos 10 caracteres."),
    source: z.string().optional().default("website_contact_form"),
});

export type Lead = z.infer<typeof LeadSchema>;
