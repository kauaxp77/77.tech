import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CalculatorWizard } from "@/components/calculator/CalculatorWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Estimativa Estrutural | 77xp Tech Solutions",
    description: "Estime a arquitetura, complexidade e o investimento preliminar do seu projeto.",
};

export default function CalculadoraPage() {
    return (
        <>
            <Header />
            <main className="flex-1 pt-32 pb-24 min-h-screen flex items-center relative overflow-hidden bg-gradient-to-b from-[#050505] to-[#0a0a0a]">
                {/* Decorative ambient lights that won't lag devices */}
                <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-[var(--color-primary)]/5 blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full" />
                <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-[var(--color-secondary)]/10 blur-[120px] -translate-y-1/2 pointer-events-none rounded-full" />

                <div className="container mx-auto px-4 lg:px-12 relative z-10 w-full flex items-center justify-center">
                    <CalculatorWizard />
                </div>
            </main>
            <Footer />
        </>
    );
}
