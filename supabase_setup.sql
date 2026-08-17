-- Execute este script no SQL Editor do painel do Supabase para inicializar seu banco de dados.

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    project_type TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Como nosso backend utiliza a "service_role" (Chave Master) via API Route no servidor (Next.js),
-- Não precisamos habilitar o Row Level Security (RLS) para usuários web por segurança de exposição,
-- pois o navegador do usuário final NUNCA fala com o banco de dados diretamente, e sim a nossa Rota /api/leads segura.
