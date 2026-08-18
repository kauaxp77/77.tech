import { createClient } from '@/lib/supabase/server';
import { EventBus } from '@/lib/events';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    // Vercel CRON Request Verification via Header
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized Cron Request', { status: 401 });
    }

    const supabase = await createClient();

    // Buscar leads que estão em "NEGOCIACAO"
    const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'NEGOCIACAO');

    if (error) {
        return new NextResponse(`Engine Error: ${error.message}`, { status: 500 });
    }

    const now = new Date();
    let stagnationCounter = 0;

    for (const lead of (leads || [])) {
        // Sem a coluna 'updated_at' estrita, vamos usar data de criação ou sla para medir idade estagnada grosseiramente
        // Num BD B2B Enterprise, o "last_activity" rastreia interações
        const daysSinceCreation = (now.getTime() - new Date(lead.created_at).getTime()) / (1000 * 3600 * 24);

        if (daysSinceCreation >= 5) {
            // ICEBREAKER TRIGGER
            await EventBus.emit('lead.stagnated', lead);
            stagnationCounter++;
        }
    }

    return NextResponse.json({
        success: true,
        message: `Stagnation Engine executed. ${stagnationCounter} Icebreaker Events triggered.`,
        timestamp: new Date().toISOString()
    });
}
