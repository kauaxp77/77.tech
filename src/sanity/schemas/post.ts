// Representação base da estrutura do Painel do Sanity para Posts

export const postSchema = {
    name: "post",
    title: "Blog Post",
    type: "document",
    fields: [
        {
            name: "title",
            title: "Título",
            type: "string",
            validation: (Rule: any) => Rule.required(),
        },
        {
            name: "slug",
            title: "Slug (URL)",
            type: "slug",
            options: { source: "title" },
        },
        {
            name: "excerpt",
            title: "Resumo Curto",
            type: "text",
        },
        {
            name: "category",
            title: "Categoria",
            type: "string",
        },
        {
            name: "date",
            title: "Data (Label Formatada)",
            type: "string",
        },
        {
            name: "readingTime",
            title: "Tempo de Leitura",
            type: "string",
        },
        {
            name: "coverImage",
            title: "Imagem de Capa",
            type: "image",
            options: { hotspot: true },
        },
        // Futuro: array 'block' para rich text portable-text Content
    ],
};
