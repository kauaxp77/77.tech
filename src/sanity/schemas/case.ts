// Representação base da estrutura do Painel do Sanity para Cases de Sucesso

export const caseSchema = {
    name: "case",
    title: "Case de Sucesso",
    type: "document",
    fields: [
        {
            name: "name",
            title: "Nome do Cliente/Projeto",
            type: "string",
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: "category",
            title: "Categoria do Case",
            type: "string",
        },
        {
            name: "description",
            title: "Descrição e Desafio",
            type: "text",
        },
        {
            name: "techStack",
            title: "Stack Tecnológica Utilizada",
            type: "array",
            of: [{ type: "string" }],
        },
        {
            name: "href",
            title: "Link do Case (Opcional)",
            type: "url",
        },
        {
            name: "image",
            title: "Imagem de Vitrine",
            type: "image",
            options: { hotspot: true },
        },
    ],
};
