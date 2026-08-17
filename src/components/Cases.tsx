"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface CaseItem {
    name: string;
    imageUrl: string;
    category: string;
    description: string;
    techStack: string[];
    href: string;
}

interface Props {
    casesItems: CaseItem[];
}

export function Cases({ casesItems }: Props) {
    return (
        <section id="cases" className="py-32 bg-[#030303] border-y border-white/5">
            <div className="container mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="mb-20 text-center"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Projetos que transformam tecnologia em <span className="text-[var(--color-primary)]">resultado.</span>
                    </h2>
                </motion.div>

                <div className="space-y-16 lg:space-y-32">
                    {casesItems.map((item, index) => (
                        <motion.div
                            key={item.name}
                            initial={{ opacity: 0, y: 40 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.8 }}
                            className={`flex flex-col lg:flex-row gap-12 items-center ${index % 2 !== 0 ? "lg:flex-row-reverse" : ""}`}
                        >
                            <div className="w-full lg:w-1/2 relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] opacity-0 group-hover:opacity-20 rounded-2xl transition-opacity duration-500 blur-xl"></div>
                                <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden glass border border-white/10">
                                    <Image
                                        src={item.imageUrl}
                                        alt={item.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none mix-blend-overlay"></div>
                                </div>
                            </div>

                            <div className="w-full lg:w-1/2 lg:px-8">
                                <div className="inline-block px-3 py-1 mb-6 rounded-full glass border border-white/10 text-xs font-semibold tracking-wider text-[var(--color-secondary)] uppercase">
                                    {item.category}
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
                                    {item.name}
                                </h3>
                                <p className="text-lg text-[var(--color-text-secondary)] mb-8 leading-relaxed">
                                    {item.description}
                                </p>
                                <div className="flex flex-wrap gap-2 mb-10">
                                    {item.techStack.map(tech => (
                                        <span key={tech} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-[var(--color-text-tertiary)]">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                                <Link href={item.href} className="inline-flex items-center text-white font-medium hover:text-[var(--color-primary)] transition-colors group">
                                    Ver estudo de caso complet o <ArrowUpRight size={20} className="ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
