-- ESQUEMA DO 77.TECH PARA O AMBIENTE LOCAL (npx supabase start)
-- Reproduz as tabelas que o site usa em produção (leads, meetings, audit_logs),
-- já com as regras de acesso da correção do admin (app_metadata).
-- ATENÇÃO: é só para desenvolvimento local. O banco de produção não usa estas
-- migrações; mudanças em produção ficam em supabase/hotfix/.

create table public.leads (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    company text,
    phone text,
    project_type text,
    message text,
    source text default 'Orgânico',
    score integer default 0,
    priority text default 'BAIXA' check (priority in ('ALTA', 'MEDIA', 'BAIXA')),
    sla_deadline timestamptz,
    status text default 'NOVO' check (status in ('NOVO', 'CONTATO', 'NEGOCIACAO', 'FECHADO', 'PERDIDO')),
    estimated_value numeric,
    mrr numeric,
    arr numeric,
    loss_reason text,
    created_at timestamptz default now()
);

create table public.meetings (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid references public.leads (id) on delete cascade,
    title text not null,
    meeting_date timestamptz not null,
    platform text,
    meeting_link text,
    status text default 'SCHEDULED',
    created_at timestamptz default now()
);

create table public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    entity_type text not null,
    entity_id uuid,
    action text not null,
    user_id uuid,
    user_email text,
    new_data jsonb,
    created_at timestamptz default now()
);

create index meetings_meeting_date_idx on public.meetings (meeting_date);
create index audit_logs_entity_id_idx on public.audit_logs (entity_id, created_at desc);

alter table public.leads enable row level security;
alter table public.meetings enable row level security;
alter table public.audit_logs enable row level security;

-- Formulários do site: qualquer visitante cria lead.
create policy "Permitir insercoes anonimas" on public.leads
    for insert with check (true);

-- Painel: só admin com papel definido pelo servidor (app_metadata).
create policy "Permitir leitura para administradores" on public.leads
    for select using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Permitir update para administradores" on public.leads
    for update using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins gerenciam reunioes" on public.meetings
    for all
    using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Trilha de auditoria: admin lê e grava; ninguém edita nem apaga.
create policy "Admins leem auditoria" on public.audit_logs
    for select using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "Admins gravam auditoria" on public.audit_logs
    for insert with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
