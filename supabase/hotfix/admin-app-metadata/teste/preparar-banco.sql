-- Banco de teste que imita o Supabase do 77.tech (só para rodar localmente em container).
-- Reproduz: papéis anon/authenticated, auth.users, auth.jwt() e as regras de acesso
-- do update_status.sql, mais uma tabela criada fora do repositório no mesmo padrão.

create role anon nologin;
create role authenticated nologin;

create schema auth;
grant usage on schema auth to anon, authenticated;

create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    raw_app_meta_data jsonb default '{}'::jsonb,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    last_sign_in_at timestamptz
);

-- Mesma definição usada pelo Supabase: lê as claims do token da requisição.
create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;
grant execute on function auth.jwt() to anon, authenticated;

create table public.leads (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text not null,
    status text default 'NOVO',
    created_at timestamptz default now()
);
grant select, insert, update on public.leads to anon, authenticated;
alter table public.leads enable row level security;

-- Regras idênticas às do update_status.sql
create policy "Permitir insercoes anonimas" on public.leads
    for insert with check (true);
create policy "Permitir leitura para administradores" on public.leads
    for select using (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
create policy "Permitir update para administradores" on public.leads
    for update using (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Tabela que existe em produção mas não está no repositório, com regra no mesmo padrão
create table public.meetings (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid,
    title text
);
grant select, insert, delete on public.meetings to authenticated;
alter table public.meetings enable row level security;
create policy "Admins gerenciam reunioes" on public.meetings
    for all
    using (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
    with check (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Situação de hoje: o makeAdmin.js deu role admin no user_metadata para todo mundo.
insert into auth.users (email, raw_user_meta_data) values
    ('admin@77xp.com', '{"role": "admin"}'),
    ('intruso@exemplo.com', '{"role": "admin"}');

insert into public.leads (name, email) values
    ('Ana', 'ana@cliente.com'),
    ('Bruno', 'bruno@cliente.com');

insert into public.meetings (title) values ('Call de alinhamento');
