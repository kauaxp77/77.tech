import { NextResponse } from "next/server";
import { LeadSchema } from "@/schemas/lead";
import { LeadService } from "@/services/leadService";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Validacao Sever-side indestrutível com Zod
        const validationResult = LeadSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    error: "Payload de dados inválido.",
                    details: validationResult.error.flatten()
                },
                { status: 400 }
            );
        }

        // 2. Extraçao Segura do Payload
        const lead = validationResult.data;

        // 3. Delegation Architectura (Monolith) -> Domain Layer Services
        await LeadService.processNewLead(lead);

        // 4. Retorno de Sucesso Ocultando Detalhes Internos
        return NextResponse.json(
            { success: true, message: "Engenharia notificada com sucesso." },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("[API] POST /api/leads error:", error.message || error);

        // Fallback error. Tratamento universal.
        return NextResponse.json(
            { error: "Erro interno ao processar lead. Nossa observabilidade foi notificada." },
            { status: 500 }
        );
    }
}
