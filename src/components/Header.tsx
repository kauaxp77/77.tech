"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/Button";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navLinks = [
        { label: "Início", href: "/" },
        { label: "Soluções", href: "#solutions" },
        { label: "Metodologia", href: "#methodology" },
        { label: "Cases", href: "#cases" },
        { label: "Blog", href: "/blog" },
        { label: "Contato", href: "/contato" },
    ];

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "glass border-b border-[rgba(255,255,255,0.05)] py-3" : "bg-transparent py-5"
                    }`}
            >
                <div className="container mx-auto px-6 lg:px-12 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-1 group">
                        <span className="text-2xl font-bold text-white tracking-tight">77</span>
                        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                            xp
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex flex-1 justify-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-white transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:flex shrink-0">
                        <Link href="/contato">
                            <Button size="sm">Faça um Orçamento</Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: "-100%" }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: "-100%" }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="fixed inset-0 z-[60] bg-[#050505]/95 backdrop-blur-3xl flex flex-col pt-24 px-6 md:hidden"
                    >
                        <button
                            className="absolute top-6 right-6 text-white p-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                            aria-label="Fechar menu"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <nav className="flex flex-col gap-6 items-center w-full">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.label}
                                    href={link.href}
                                    className="text-2xl font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors py-2 border-b border-white/5 w-full text-center"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <div className="mt-8 w-full">
                                <Link href="/contato" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button size="lg" className="w-full">Faça um Orçamento</Button>
                                </Link>
                            </div>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
