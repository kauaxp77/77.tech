'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, FileText, LayoutDashboard, LogOut, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Secao = {
    nome: string
    href: string
    icone: typeof LayoutDashboard
    // Outras rotas que pertencem à mesma seção (ex.: a página de cada proposta)
    inclui?: string[]
}

const SECOES_DO_PAINEL: Secao[] = [
    { nome: 'Visão geral', href: '/admin', icone: LayoutDashboard },
    { nome: 'Leads', href: '/admin/crm', icone: Users },
    { nome: 'Reuniões', href: '/admin/reunioes', icone: CalendarDays },
    { nome: 'Propostas', href: '/admin/propostas', icone: FileText, inclui: ['/admin/proposal'] },
]

function estaAtiva(secao: Secao, caminho: string) {
    if (secao.href === '/admin') return caminho === '/admin'
    return [secao.href, ...(secao.inclui ?? [])].some((base) => caminho === base || caminho.startsWith(`${base}/`))
}

/** Conteúdo do menu do painel: usado fixo no computador e na gaveta do celular. */
export function AdminNav({ emailDoAdmin, aoNavegar }: { emailDoAdmin?: string; aoNavegar?: () => void }) {
    const caminho = usePathname()
    const router = useRouter()

    const sair = async () => {
        await createClient().auth.signOut()
        router.push('/admin/login')
        router.refresh()
    }

    return (
        <div className="flex h-full flex-col">
            <div className="h-16 lg:h-20 flex items-center px-6 lg:px-8 border-b border-white/5 shrink-0">
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                    77xp Admin
                </span>
            </div>

            <nav aria-label="Seções do painel" className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                {SECOES_DO_PAINEL.map((secao) => {
                    const ativa = estaAtiva(secao, caminho)
                    const Icone = secao.icone
                    return (
                        <Link
                            key={secao.href}
                            href={secao.href}
                            onClick={aoNavegar}
                            aria-current={ativa ? 'page' : undefined}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${ativa
                                ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icone size={18} aria-hidden />
                            {secao.nome}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-white/5 space-y-2 shrink-0">
                {emailDoAdmin && (
                    <p className="px-4 text-xs text-white/40 truncate" title={emailDoAdmin}>
                        {emailDoAdmin}
                    </p>
                )}
                <button
                    type="button"
                    onClick={sair}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={18} aria-hidden />
                    Finalizar Sessão
                </button>
            </div>
        </div>
    )
}
