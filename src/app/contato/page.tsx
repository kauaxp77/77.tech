import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ContactForm } from "@/components/ContactForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contato | 77xp Tech Solutions",
    description: "Fale com os especialistas da 77xp Tech Solutions e transforme seu próximo desafio em um produto digital escalável.",
};

export default function ContatoPage() {
    return (
        <>
            <Header />
            <main className="flex-1 pt-32 pb-24">
                <div className="container mx-auto px-6 lg:px-12">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Vamos construir algo <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">incrível.</span>
                        </h1>
                        <p className="text-lg text-[var(--color-text-secondary)]">
                            Conte-nos sobre o seu desafio tecnológico. Nossa equipe entrará em contato em até 24 horas.
                        </p>
                    </div>

                    <ContactForm />
                </div>
            </main>
            <Footer />
        </>
    );
}
