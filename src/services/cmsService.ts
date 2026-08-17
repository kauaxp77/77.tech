import { createClient } from "next-sanity";
import { blogPosts, casesItems } from "@/lib/data";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = "2024-01-01";

const hasSanity = Boolean(projectId);

export const sanityClient = hasSanity
    ? createClient({
        projectId,
        dataset,
        apiVersion,
        useCdn: false, // ISR provides cache, bypassing CDN for real-time rebuild accuracy
    })
    : null;

export class CMSService {
    /**
     * Puxa os artigos do Sanity. Caso o ambiente não possua chaves configuradas,
     * ele simula a extração devolvendo a baseline de dados estruturados locais.
     */
    static async getPosts() {
        if (!hasSanity) {
            console.warn("[CMS Fallback] NEXT_PUBLIC_SANITY_PROJECT_ID ausente. Servindo Blog local.");
            return blogPosts;
        }

        // Injetamos um GROQ Query básico caso exista o Sanity
        const query = `*[_type == "post"] | order(publishedAt desc) { 
        title, 
        "slug": slug.current, 
        excerpt, 
        category, 
        date, 
        readingTime, 
        "coverImage": coverImage.asset->url 
    }`;

        try {
            return await sanityClient!.fetch(query);
        } catch {
            console.error("Erro na busca do Sanity, regressando para local.");
            return blogPosts;
        }
    }

    static async getCases() {
        if (!hasSanity) {
            console.warn("[CMS Fallback] NEXT_PUBLIC_SANITY_PROJECT_ID ausente. Servindo Cases locais.");
            return casesItems;
        }

        const query = `*[_type == "case"] | order(_createdAt asc) { 
        name, 
        "imageUrl": image.asset->url, 
        category, 
        description, 
        techStack, 
        href 
    }`;

        try {
            return await sanityClient!.fetch(query);
        } catch {
            console.error("Erro na busca do Sanity, regressando para local.");
            return casesItems;
        }
    }
}
