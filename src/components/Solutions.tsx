"use client";

import { motion } from "framer-motion";
import { solutions } from "@/lib/data";
import { LayoutTemplate, AppWindow, Code2, Server, ArrowRight } from "lucide-react";
import Link from "next/link";

const iconMap: Record<string, React.ReactNode> = {
    LayoutTemplate: <LayoutTemplate size={32} className="text-[var(--color-primary)]" />,
    AppWindow: <AppWindow size={32} className="text-[var(--color-secondary)]" />,
    Code2: <Code2 size={32} className="text-[var(--color-primary)]" />,
    Server: <Server size={32} className="text-[var(--color-secondary)]" />,
};

export function Solutions() {
    return (
        <section id="solutions" className="py-32 relative">
            <div className="container mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-3xl mb-20"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Soluções construídas <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]">para crescer.</span>
                    </h2>
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
                        A 77xp transforma desafios tecnológicos em produtos digitais robustos, escaláveis e preparados para evolução.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {solutions.map((solution, index) => (
                        <motion.div
                            key={solution.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            className="group relative p-8 md:p-10 rounded-2xl glass border border-white/5 hover:border-[var(--color-primary)]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,77,255,0.1)] overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 text-5xl font-bold text-white/5 group-hover:text-white/10 transition-colors pointer-events-none">
                                {solution.id}
                            </div>

                            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:ring-[var(--color-primary)]/50 transition-all">
                                {iconMap[solution.icon]}
                            </div>

                            <h3 className="text-2xl font-semibold text-white mb-4 group-hover:text-[var(--color-secondary)] transition-colors">
                                {solution.title}
                            </h3>

                            <p className="text-[var(--color-text-secondary)] mb-8 leading-relaxed h-[72px]">
                                {solution.description}
                            </p>

                            <Link href="/contato" className="inline-flex items-center text-sm font-semibold text-white group-hover:text-[var(--color-primary)] transition-colors">
                                Saiba mais <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
