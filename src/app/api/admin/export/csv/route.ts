import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== 'admin') {
        return new NextResponse("Unauthorized. Credenciais Classe Administrativa requeridas.", { status: 401 });
    }

    const { data: leads, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return new NextResponse("Database Error", { status: 500 });
    }

    // Engine de Parsing JSON para CSV Profissional (Power BI Ready)
    const headers = [
        "ID_SISTEMA",
        "DATA_CAPTURA",
        "NOME_LEAD",
        "EMAIL",
        "TELEFONE",
        "EMPRESA",
        "TIPO_PROJETO",
        "ORIGEM_UTM",
        "CRM_SCORE",
        "PRIORIDADE",
        "ESTAGIO_FUNIL",
        "VALOR_ESTIMADO",
        "RECEITA_MENSAL_MRR",
        "RECEITA_ANUAL_ARR",
        "MOTIVO_PERDIDO",
        "MENSAGEM_ESCOPO"
    ];

    const rows = leads.map(l => [
        l.id,
        new Date(l.created_at).toLocaleString('pt-BR'),
        `"${l.name.replace(/"/g, '""')}"`,
        l.email,
        l.phone || 'N/A',
        `"${(l.company || 'Pessoa Física').replace(/"/g, '""')}"`,
        `"${l.project_type || 'N/A'}"`,
        l.source || 'Orgânico',
        l.score || 0,
        l.priority || 'BAIXA',
        l.status,
        l.estimated_value || 0,
        l.mrr || 0,
        l.arr || 0,
        `"${(l.loss_reason || '').replace(/"/g, '""')}"`,
        `"${(l.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    // Montando a String Bruta do CSV compatível com MS Excel Localizado BR
    const csvContent = [
        headers.join(";"),
        ...rows.map(r => r.join(";"))
    ].join("\n");

    // Adicionado BOM (Byte Order Mark) para compatibilidade perfeita com Acentuação UTF-8 no MS Excel
    const BOM = "\uFEFF";

    return new NextResponse(BOM + csvContent, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="77xp_CRM_Export_${new Date().toISOString().split('T')[0]}.csv"`,
        }
    });
}
