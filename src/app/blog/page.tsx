import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogSection } from "@/components/BlogSection";
import { CMSService } from "@/services/cmsService";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
    title: "Blog & Conhecimento | 77xp Tech Solutions",
    description: "Artigos técnicos, arquitetura de software e cultura de engenharia pela equipe da 77xp.",
};

export default async function BlogPage() {
    const posts = await CMSService.getPosts();

    return (
        <>
            <Header />
            <main className="flex-1 pt-24">
                <BlogSection posts={posts} />
            </main>
            <Footer />
        </>
    );
}
