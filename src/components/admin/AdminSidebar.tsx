'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BookOpen, Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const navLinks = [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'CRM (Leads)', href: '/admin/crm', icon: Users },
        { name: 'Sanity Studio', href: '/studio', icon: BookOpen },
    ]

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
        router.refresh()
    }

    return (
        <aside className="w-64 h-screen bg-black border-r border-white/10 flex flex-col fixed left-0 top-0">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-8 border-b border-white/5">
                <span className="text-xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
                    77xp Admin
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
                {navLinks.map((link) => {
                    const isActive = pathname === link.href
                    const Icon = link.icon
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive
                                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                    : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon size={18} />
                            {link.name}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut size={18} />
                    Finalizar Sessão
                </button>
            </div>
        </aside>
    )
}
