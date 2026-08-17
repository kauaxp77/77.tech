import React from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata = {
    title: 'Painel Corporativo | 77xp Tech Solutions',
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-black/95 flex">
            <AdminSidebar />

            <main className="flex-1 ml-64 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
