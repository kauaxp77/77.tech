'use client'

import React, { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { AdminNav } from './AdminSidebar'

/**
 * Estrutura do painel: menu lateral fixo no computador; no celular, barra de topo
 * com o botão ☰ que abre o menu por cima da página.
 */
export function AdminShell({ emailDoAdmin, children }: { emailDoAdmin?: string; children: React.ReactNode }) {
    const [menuAberto, setMenuAberto] = useState(false)

    useEffect(() => {
        if (!menuAberto) return
        const fecharComEsc = (evento: KeyboardEvent) => {
            if (evento.key === 'Escape') setMenuAberto(false)
        }
        document.addEventListener('keydown', fecharComEsc)
        return () => document.removeEventListener('keydown', fecharComEsc)
    }, [menuAberto])

    return (
        <div className="min-h-screen bg-black/95">
            {/* Computador: menu lateral fixo */}
            <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-black border-r border-white/10">
                <AdminNav emailDoAdmin={emailDoAdmin} />
            </aside>

            {/* Celular: barra de topo com o botão do menu */}
            <header className="lg:hidden sticky top-0 z-30 flex h-16 items-center justify-between px-4 bg-black/90 backdrop-blur-md border-b border-white/10">
                <span className="text-lg font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                    77xp Admin
                </span>
                <button
                    type="button"
                    onClick={() => setMenuAberto(true)}
                    aria-label="Abrir menu"
                    aria-expanded={menuAberto}
                    aria-controls="menu-do-painel"
                    className="p-2 -mr-2 rounded-lg text-white hover:bg-white/10"
                >
                    <Menu size={24} aria-hidden />
                </button>
            </header>

            {menuAberto && (
                <div className="lg:hidden fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setMenuAberto(false)} aria-hidden />
                    <aside id="menu-do-painel" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-black border-r border-white/10 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setMenuAberto(false)}
                            aria-label="Fechar menu"
                            className="absolute top-3 right-3 p-2 rounded-lg text-white/70 hover:bg-white/10"
                        >
                            <X size={20} aria-hidden />
                        </button>
                        <AdminNav emailDoAdmin={emailDoAdmin} aoNavegar={() => setMenuAberto(false)} />
                    </aside>
                </div>
            )}

            <main className="lg:ml-64 px-4 py-6 sm:px-6 lg:p-8">
                <div className="max-w-7xl mx-auto">{children}</div>
            </main>
        </div>
    )
}
