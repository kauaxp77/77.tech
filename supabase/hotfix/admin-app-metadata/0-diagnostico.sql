-- PASSO 0 — DIAGNÓSTICO (só lê: não altera nada)
-- Cole no Supabase do 77.tech: SQL Editor → New query → Run.

-- 1) Quem tem papel de admin hoje, e em qual campo
--    role_no_perfil  = user_metadata: o próprio usuário consegue mudar (INSEGURO)
--    role_do_servidor = app_metadata: só o servidor muda (SEGURO)
select
    email,
    created_at,
    last_sign_in_at,
    raw_user_meta_data ->> 'role' as role_no_perfil,
    raw_app_meta_data ->> 'role' as role_do_servidor
from auth.users
order by created_at;

-- 2) Regras de acesso (RLS) que ainda usam o campo inseguro
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where coalesce(qual, '') like '%user_metadata%'
   or coalesce(with_check, '') like '%user_metadata%';

-- 3) Tabelas do site e se a proteção de acesso (RLS) está ligada em cada uma
select c.relname as tabela, c.relrowsecurity as rls_ligado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relrowsecurity, c.relname;
