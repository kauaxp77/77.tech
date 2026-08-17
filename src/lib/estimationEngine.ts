import { CalculatorAnswers } from "@/store/useCalculatorStore";

export function calculateEstimation(answers: Partial<CalculatorAnswers>) {
    let basePrice = 0;
    let archSuggested = "Monolith Flexível";

    switch (answers.projectType) {
        case "saas":
            basePrice += 45000;
            archSuggested = "Microserviços Essenciais & Serverless DB";
            break;
        case "ecommerce":
            basePrice += 60000;
            archSuggested = "Arquitetura Hexagonal com ElasticSearch";
            break;
        case "app_mobile":
            basePrice += 50000;
            archSuggested = "Backend Core (Node.js/Spring) + Mobile SDK/React Native";
            break;
        case "api":
            basePrice += 25000;
            archSuggested = "Serverless Cloud Functions Gateway";
            break;
        default:
            basePrice += 30000;
            archSuggested = "Next.js App Router Integrado + BaaS";
    }

    if (answers.experienceLevel === "premium") basePrice *= 1.4;
    if (answers.experienceLevel === "professional") basePrice *= 1.15;

    if (answers.complexity === "enterprise") basePrice *= 1.8;
    if (answers.complexity === "scale") basePrice *= 1.4;

    if (answers.infrastructure === "high_availability") basePrice *= 1.5;
    if (answers.infrastructure === "cloud") basePrice *= 1.2;

    if (answers.deadline === "urgent") basePrice *= 1.5;

    const minPrice = basePrice * 0.8;
    const maxPrice = basePrice * 1.25;

    const formatBRL = (val: number) =>
        new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
            maximumFractionDigits: 0,
        }).format(val);

    return {
        architecture: archSuggested,
        range: `${formatBRL(minPrice)} - ${formatBRL(maxPrice)}`,
        profile: `Projeto Nível ${answers.complexity?.toUpperCase() || "BASE"} com Design ${answers.experienceLevel?.toUpperCase() || "FUNCIONAL"}`,
    };
}

export function formatCalculatorToLeadPayload(answers: Partial<CalculatorAnswers>) {
    // Agrrupa os dados para enviar ao backend nativo (schema do Contact)
    const fullMessage = `
[LEAD VIA CALCULADORA INTERATIVA]
Perfil: ${answers.projectType}
Experiência: ${answers.experienceLevel}
Complexidade: ${answers.complexity}
Infra: ${answers.infrastructure}
Prazo exigido: ${answers.deadline}
Desafio Relatado: ${answers.challengeDescription || "Não detalhado."}
  `.trim();

    // O projectType no Schema está engessado com um Enum,
    // Para evitar erros do Zod no backend, vamos injetar como 'other' os não mapeados
    // ou formatar de acordo com a regra.
    const validTypes = ["saas", "landing_page", "api", "infra", "other"];
    const mappedType = validTypes.includes(answers.projectType as string) ? answers.projectType : "other";

    return {
        name: answers.leadName || "Nome Não Informado",
        email: answers.leadEmail || "email@invalido.com",
        phone: answers.leadPhone || undefined,
        company: answers.leadCompany || undefined,
        projectType: mappedType,
        message: fullMessage,
    };
}
