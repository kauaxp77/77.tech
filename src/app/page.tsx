import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { TrustBar } from "@/components/TrustBar";
import { Solutions } from "@/components/Solutions";
import { Differentials } from "@/components/Differentials";
import { Methodology } from "@/components/Methodology";
import { Cases } from "@/components/Cases";
import { BlogSection } from "@/components/BlogSection";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { CMSService } from "@/services/cmsService";

export const revalidate = 3600; // Recalcular dados do Sanity a cada 1 Hora e distribuir pelo CDN Cloud.

export default async function Home() {
  const posts = await CMSService.getPosts();
  const cases = await CMSService.getCases();

  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <Solutions />
        <Differentials />
        <Methodology />
        <Cases casesItems={cases} />
        <BlogSection posts={posts} />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
