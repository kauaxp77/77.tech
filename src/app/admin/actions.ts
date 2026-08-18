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

export async function moveLead(id: string, newStatus: string, metadata?: { loss_reason?: string; estimated_value?: number; mrr?: number }) {
    const supabase = await createClient()

    const updatePayload: Record<string, any> = { status: newStatus };
    if (metadata?.loss_reason) updatePayload.loss_reason = metadata.loss_reason;
    if (metadata?.estimated_value !== undefined) updatePayload.estimated_value = metadata.estimated_value;
    if (metadata?.mrr !== undefined) updatePayload.mrr = metadata.mrr;

    // Check permission automatically enforced by Supabase SSR Client transmitting Cookies
    const { error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', id)

    if (error) {
        console.error('Error na movimentação de lead CRM:', error)
        throw new Error('Falha arquitetural de segurança ao atualizar status do Lead.')
    }

    // [SPRINT 9.6] Gravar Trilha de Auditoria Universal (Caixa Preta)
    // Tenta obter o usuário logado (opcional, só p/ gravar, pode falhar/null sem problemas)
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('audit_logs').insert([{
        entity_type: 'lead',
        entity_id: id,
        action: `STATUS_CHANGED_TO_${newStatus.toUpperCase()}`,
        user_id: user?.id || null,
        user_email: user?.email || 'N/A (Anônimo ou Admin Root)',
        new_data: updatePayload
    }]);

    // Emitir Domínio (Sprint 7F) para Hooks (ex: Automações Discord/Webhooks)
    await EventBus.emit('lead.stage_changed', { leadId: id, newStatus });

    revalidatePath('/admin')
}

export async function scheduleMeeting(leadId: string, title: string, meetingDate: string, platform: string, link: string) {
    try {
        const supabase = await createClient()

        const { error } = await supabase.from('meetings').insert([{
            lead_id: leadId,
            title,
            meeting_date: meetingDate, // ISO 8601 string
            platform,
            meeting_link: link,
            status: 'SCHEDULED'
        }]);

        if (error) {
            console.error('Falha ao registrar reunião Call B2B no BD:', error);
            return { error: `Supabase Policy/Format Error: ${error.message} (Code: ${error.code})` };
        }

        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        console.error('Critical Action Error:', e);
        return { error: 'Falha crítica ao se comunicar com o banco de Oportunidades.' };
    }
}

export async function getLeadAudits(leadId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', leadId)
        .order('created_at', { ascending: false });

    return data || [];
}
