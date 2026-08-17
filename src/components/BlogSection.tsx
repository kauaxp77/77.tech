"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface BlogPost {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    date: string;
    readingTime: string;
    coverImage: string;
}

interface Props {
    posts: BlogPost[];
}

export function BlogSection({ posts }: Props) {
    return (
        <section className="py-32 relative">
            <div className="container mx-auto px-6 lg:px-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6"
                >
                    <div className="max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Conhecimento que gera tecnologia <span className="text-[var(--color-secondary)]">melhor.</span>
                        </h2>
                        <p className="text-lg text-[var(--color-text-secondary)]">
                            Artigos técnicos, arquitetura de software e cultura de engenharia.
                        </p>
                    </div>
                    <Link href="/blog" className="text-sm font-semibold text-white/50 hover:text-white transition-colors uppercase tracking-wider">
                        Ver todos os artigos
                    </Link>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.slice(0, 3).map((post, index) => (
                        <motion.article
                            key={post.slug}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="group flex flex-col glass border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
                        >
                            <div className="relative h-56 w-full overflow-hidden bg-[#111]">
                                <Image
                                    src={post.coverImage}
                                    alt={post.title}
                                    fill
                                    className="object-cover brightness-75 group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 rounded-full glass border border-white/20 text-xs font-semibold text-white truncate shadow-lg">
                                        {post.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)] font-medium mb-4 uppercase tracking-wider">
                                    <time>{post.date}</time>
                                    <span>&bull;</span>
                                    <span>{post.readingTime}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-4 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-[var(--color-text-secondary)] text-sm mb-8 line-clamp-3 flex-1">
                                    {post.excerpt}
                                </p>
                                <Link href={`/blog/${post.slug}`} className="inline-flex items-center text-sm font-semibold text-white group-hover:text-[var(--color-primary)] transition-colors mt-auto">
                                    Ler artigo &rarr;
                                </Link>
                            </div>
                        </motion.article>
                    ))}
                </div>
            </div>
        </section>
    );
}
