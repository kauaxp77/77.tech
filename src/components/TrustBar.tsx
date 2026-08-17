"use client";

import { motion } from "framer-motion";

const indicators = [
    "Software sob medida",
    "Arquitetura escalável",
    "Performance",
    "Segurança",
    "Experiência Full Cycle",
];

export function TrustBar() {
    return (
        <section className="py-10 border-b border-white/5 bg-[#050505]/50 flex justify-center overflow-hidden">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-16">
                    {indicators.map((text, i) => (
                        <motion.div
                            key={text}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className="flex items-center gap-2 group"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_rgba(124,77,255,0.8)] group-hover:bg-[var(--color-secondary)] transition-colors"></div>
                            <span className="text-sm md:text-base font-medium text-[var(--color-text-secondary)] tracking-wide group-hover:text-white transition-colors">
                                {text}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
