"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import Link from "next/link";

export function CTA() {
    return (
        <section className="relative py-32 overflow-hidden border-t border-white/5 bg-[#050505]">
            {/* Abstract Background for CTA */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                <div className="w-[800px] h-[800px] bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[200px] animate-pulse" style={{ animationDuration: '6s' }}></div>
            </div>

            <div className="container relative z-10 mx-auto px-6 lg:px-12">
                <div className="max-w-4xl mx-auto glass rounded-3xl p-10 md:p-16 border border-white/10 text-center relative overflow-hidden group hover:border-[var(--color-primary)]/50 transition-colors duration-500 shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="relative z-10"
                    >
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            Seu próximo produto digital começa com uma <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">boa arquitetura.</span>
                        </h2>
                        <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed mb-10 max-w-2xl mx-auto">
                            Conte-nos o que você está construindo. A 77xp transforma desafios complexos em soluções digitais escaláveis.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/contato" className="w-full sm:w-auto">
                                <Button size="lg" className="w-full">
                                    Falar com a 77xp
                                </Button>
                            </Link>
                            <Link href="#solutions" className="w-full sm:w-auto">
                                <Button variant="outline" size="lg" className="w-full">
                                    Conhecer nossas soluções
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
