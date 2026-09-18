import { blogPosts, casesItems } from "@/lib/data";

/**
 * Conteúdo do site (blog e cases). Os textos ficam em src/lib/data.ts.
 * (O Sanity foi removido: o site em produção já servia só esse conteúdo local.)
 */
export class CMSService {
    static async getPosts() {
        return blogPosts;
    }

    static async getCases() {
        return casesItems;
    }
}
