'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { EventBus } from '@/lib/events'

export async function fetchLeads() {
    const supabase = await createClient()
    const { data: leads, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })

    if (error) {
        console.error('Falha de leitura RLS Mismatch Dashboard:', error)
        return []
    }
    return leads
}

export async function moveLead(id: string, newStatus: string) {
    const supabase = await createClient()

    // Check permission automatically enforced by Supabase SSR Client transmitting Cookies
    const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id)

    if (error) {
        console.error('Error na movimentação de lead CRM:', error)
        throw new Error('Falha arquitetural de segurança ao atualizar status do Lead.')
    }

    // Emitir Domínio (Sprint 7F) para Hooks (ex: Automações Discord/Webhooks)
    await EventBus.emit('lead.stage_changed', { leadId: id, newStatus });

    revalidatePath('/admin')
}
