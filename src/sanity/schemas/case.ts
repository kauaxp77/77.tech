// Representação Profunda de Cases de Sucesso B2B para o Sanity Studio Fase 7

export const caseSchema = {
    name: "case",
    title: "Case de Sucesso (Portfólio HQ)",
    type: "document",
    fields: [
        // Basic Info
        {
            name: "name",
            title: "Nome do Cliente / Projeto",
            type: "string",
            validation: (Rule: any) => Rule.required()
        },
        {
            name: "slug",
            title: "Identificador de URL Única (Slug)",
            type: "slug",
            options: { source: 'name', maxLength: 96 }
        },
        {
            name: "category",
            title: "Categoria do Case",
            type: "string",
            options: { list: ['Sistemas B2B', 'E-commerce', 'Aplicativo', 'Website Corporativo'] }
        },

        // Deep Content Split (Storytelling)
        {
            name: "challenge",
            title: "1. O Desafio (Contexto)",
            type: "text",
            description: "Qual era o problema central de negócios?"
        },
        {
            name: "solution",
            title: "2. A Solução (Engenharia)",
            type: "text",
            description: "Como a 77xp resolveu através de software?"
        },

        // Results & Metrics Array (Hard Facts)
        {
            name: "metrics",
            title: "Métricas de Sucesso Expositivo (ROI)",
            description: "Métricas rígidas geradas pela inserção de tecnologia.",
            type: "array",
            of: [
                {
                    type: "object",
                    fields: [
                        { name: "label", title: "Rótulo (ex: Redução de Custo)", type: "string" },
                        { name: "value", title: "Grandeza Dimensional (ex: -30%)", type: "string" }
                    ]
                }
            ]
        },

        // Client Proof
        {
            name: "testimonial",
            title: "Prova Social (Depoimento do Cliente)",
            type: "object",
            fields: [
                { name: "quote", title: "Citação Oficial", type: "text" },
                { name: "author", title: "Nome do Autor", type: "string" },
                { name: "role", title: "Cargo (Ex: C-Level, Diretor)", type: "string" }
            ]
        },

        // Technical Foundation
        {
            name: "techStack",
            title: "Stack Tecnológica Adotada",
            type: "array",
            of: [{ type: "string" }]
        },
        {
            name: "href",
            title: "Acesso ao Link em Produção (Se vivo)",
            type: "url"
        },

        // Visual HQ Assets
        {
            name: "image",
            title: "Imagem de Capa (Hero Thumbnail)",
            type: "image",
            options: { hotspot: true }
        },
        {
            name: "gallery",
            title: "Galeria Aprofundada (Telas Livres)",
            type: "array",
            of: [{ type: "image", options: { hotspot: true } }]
        }
    ],
};
