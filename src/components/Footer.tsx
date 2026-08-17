import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-[#050505] pt-16 pb-8">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-16">
                    <div className="col-span-1 md:col-span-1">
                        <Link href="/" className="flex items-center gap-1 mb-4">
                            <span className="text-2xl font-bold text-white tracking-tight">77</span>
                            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                                xp
                            </span>
                        </Link>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Transformamos desafios complexos em produtos digitais robustos, escaláveis e preparados para evolução.
                        </p>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Empresa</h4>
                        <ul className="space-y-3">
                            <li><Link href="#sobre" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Sobre</Link></li>
                            <li><Link href="#methodology" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Metodologia</Link></li>
                            <li><Link href="#cases" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Cases</Link></li>
                            <li><Link href="/blog" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Soluções</h4>
                        <ul className="space-y-3">
                            <li><Link href="#solutions" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Landing Pages</Link></li>
                            <li><Link href="#solutions" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">SaaS</Link></li>
                            <li><Link href="#solutions" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">APIs</Link></li>
                            <li><Link href="#solutions" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">DevOps</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-4">Contato</h4>
                        <ul className="space-y-3">
                            <li><Link href="/contato" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Falar com a 77xp</Link></li>
                            <li><Link href="/contato" className="text-sm text-[var(--color-text-secondary)] hover:text-white transition-colors">Solicitar orçamento</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-[var(--color-text-tertiary)] text-center md:text-left">
                        Desenvolvido por Wendson Kauã | 77xp Tech Solutions © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </footer>
    );
}
