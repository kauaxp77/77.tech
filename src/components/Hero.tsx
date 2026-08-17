"use client";

import { motion } from "framer-motion";
import { Button } from "./ui/Button";
import Link from "next/link";

export function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden border-b border-white/5">
            {/* Background Abstract Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

            {/* Abstract Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse"></div>
            <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[var(--color-secondary)] rounded-full mix-blend-screen filter blur-[128px] opacity-20 animate-pulse" style={{ animationDelay: "2s" }}></div>

            <div className="container relative z-10 mx-auto px-6 lg:px-12 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="max-w-4xl"
                >
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight">
                        Engenharia de Soluções.
                        <br />
                        <span className="text-[var(--color-text-secondary)]">Não apenas sites.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-[var(--color-text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
                        Transformamos ideias complexas em plataformas robustas, escaláveis e de alta conversão.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="#solutions">
                            <Button size="lg" className="w-full sm:w-auto">
                                Conhecer Soluções
                            </Button>
                        </Link>
                        <Link href="/calculadora">
                            <Button variant="outline" size="lg" className="w-full sm:w-auto">
                                Acessar Calculadora
                            </Button>
                        </Link>
                    </div>

                    <p className="mt-8 text-xs font-medium uppercase tracking-widest text-[var(--color-text-tertiary)]">
                        Arquitetura &bull; Desenvolvimento &bull; Infraestrutura &bull; Escalabilidade
                    </p>
                </motion.div>

                {/* Abstract 3D/Tech Element (CSS-based) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="mt-16 relative w-full max-w-3xl h-64 md:h-96 rounded-2xl glass border border-white/10 flex items-center justify-center overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none"></div>
                    {/* Simulated Code/Node Structure */}
                    <div className="relative w-full h-full flex items-center justify-center space-x-4 opacity-50">
                        <div className="w-16 h-16 rounded-xl border border-[var(--color-primary)] flex items-center justify-center shadow-[0_0_30px_rgba(124,77,255,0.3)] animate-bounce" style={{ animationDuration: '3s' }}>
                            <div className="w-4 h-4 bg-[var(--color-primary)] rounded-full"></div>
                        </div>
                        <div className="w-16 h-1 border-t border-[var(--color-text-tertiary)] border-dashed"></div>
                        <div className="w-20 h-20 rounded-xl border border-[var(--color-secondary)] flex items-center justify-center shadow-[0_0_30px_rgba(179,136,255,0.3)] animate-pulse" style={{ animationDuration: '4s' }}>
                            <div className="w-6 h-6 bg-[var(--color-secondary)] rounded-full"></div>
                        </div>
                        <div className="w-16 h-1 border-t border-[var(--color-text-tertiary)] border-dashed"></div>
                        <div className="w-16 h-16 rounded-xl border border-white/30 flex items-center justify-center animate-bounce" style={{ animationDuration: '3.5s' }}>
                            <div className="w-4 h-4 bg-white/50 rounded-full"></div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
