"use client";

import { motion } from "framer-motion";
import { methodologyFiles } from "@/lib/data";

export function Methodology() {
    return (
        <section id="methodology" className="py-32 relative">
            <div className="container mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-20 text-center md:text-left"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Do problema ao produto.
                    </h2>
                    <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed max-w-2xl">
                        Entenda nosso processo Full Cycle focado em maximizar resultados e minimizar o débito técnico.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Central Timeline Line */}
                    <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-px bg-white/10 -translate-x-1/2"></div>

                    <div className="space-y-12 relative">
                        {methodologyFiles.map((step, index) => {
                            const isEven = index % 2 === 0;
                            return (
                                <motion.div
                                    key={step.step}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    transition={{ duration: 0.6 }}
                                    className={`flex flex-col md:flex-row items-start md:items-center w-full ${isEven ? "md:flex-row-reverse" : ""}`}
                                >
                                    <div className={`hidden md:block w-1/2 ${isEven ? "pl-16" : "pr-16 text-right"}`}>
                                        <h3 className="text-2xl font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-[var(--color-text-secondary)]">{step.description}</p>
                                    </div>

                                    <div className="absolute left-8 md:left-1/2 -translate-x-1/2 flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-[#050505] shadow-[0_0_15px_rgba(0,0,0,0.5)] z-10 text-sm font-bold text-[var(--color-primary)]">
                                        {step.step}
                                    </div>

                                    <div className="pl-24 md:hidden w-full">
                                        <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                        <p className="text-sm text-[var(--color-text-secondary)]">{step.description}</p>
                                    </div>

                                    <div className="hidden md:block w-1/2"></div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
