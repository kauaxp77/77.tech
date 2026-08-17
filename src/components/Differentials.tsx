"use client";

import { motion } from "framer-motion";
import { Cpu, Zap, Shield, Maximize, MousePointerClick } from "lucide-react";

const differentials = [
    {
        title: "Arquitetura",
        description: "Estrutura preparada para crescimento e mudanças.",
        icon: <Cpu size={24} />,
    },
    {
        title: "Performance",
        description: "Aplicações extremamente rápidas e eficientes.",
        icon: <Zap size={24} />,
    },
    {
        title: "Segurança",
        description: "Boas práticas embarcadas desde o design.",
        icon: <Shield size={24} />,
    },
    {
        title: "Escalabilidade",
        description: "Sistemas desenhados para evolução.",
        icon: <Maximize size={24} />,
    },
    {
        title: "UX",
        description: "Tecnologia simples e natural para quem utiliza.",
        icon: <MousePointerClick size={24} />,
    },
];

export function Differentials() {
    return (
        <section className="py-32 bg-[#080808] border-y border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-[var(--color-primary)] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>

            <div className="container relative z-10 mx-auto px-6 lg:px-12 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="max-w-4xl mx-auto mb-20"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Não entregamos apenas código. <br className="hidden md:block" />
                        <span className="text-[var(--color-text-secondary)]">Entregamos engenharia.</span>
                    </h2>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {differentials.map((item, index) => (
                        <motion.div
                            key={item.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="glass p-8 rounded-2xl border border-white/5 text-center hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-6">
                                {item.icon}
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                            <p className="text-sm text-[var(--color-text-tertiary)]">{item.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
