import { createClient } from '@/lib/supabase/server'
import { AgendarReuniaoForm } from '@/components/admin/AgendarReuniaoForm'
import { ListaDeReunioes, type Reuniao } from '@/components/admin/ListaDeReunioes'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Reuniões | 77xp Admin',
}

const CAMPOS_DA_REUNIAO = 'id, title, meeting_date, platform, meeting_link, leads(name, company)'

export default async function ReunioesPage() {
    const supabase = await createClient()
    const agora = new Date().toISOString()

    const [{ data: proximas }, { data: anteriores }, { data: leads }] = await Promise.all([
        supabase.from('meetings').select(CAMPOS_DA_REUNIAO).gte('meeting_date', agora).order('meeting_date', { ascending: true }),
        supabase.from('meetings').select(CAMPOS_DA_REUNIAO).lt('meeting_date', agora).order('meeting_date', { ascending: false }),
        supabase.from('leads').select('id, name, company').neq('status', 'PERDIDO').order('name'),
    ])

    return (
        <div className="space-y-6">
            <header className="border-b border-white/10 pb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Reuniões</h1>
                <p className="text-white/50 text-sm mt-1">Marque chamadas com os leads e acompanhe a agenda (horário de Brasília).</p>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
                <div className="lg:order-2 lg:sticky lg:top-8">
                    <AgendarReuniaoForm leads={leads ?? []} />
                </div>
                <div className="space-y-6 lg:order-1 min-w-0">
                    <ListaDeReunioes
                        titulo="Próximas reuniões"
                        reunioes={(proximas ?? []) as unknown as Reuniao[]}
                        textoVazio="Nenhuma reunião marcada."
                    />
                    <ListaDeReunioes
                        titulo="Reuniões anteriores"
                        reunioes={(anteriores ?? []) as unknown as Reuniao[]}
                        textoVazio="Nenhuma reunião no histórico."
                        passadas
                    />
                </div>
            </div>
        </div>
    )
}
