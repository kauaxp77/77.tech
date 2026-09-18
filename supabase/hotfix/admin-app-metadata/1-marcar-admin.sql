-- PASSO 1 — MARCAR A SUA CONTA COMO ADMIN (do jeito seguro)
-- Troque seu-email@exemplo.com pelo e-mail que você usa para entrar no painel /admin.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where lower(email) = lower('seu-email@exemplo.com');

-- Conferência: deve aparecer o seu e-mail (e só quem você quer como admin).
select email, raw_app_meta_data ->> 'role' as role_do_servidor
from auth.users
where raw_app_meta_data ->> 'role' = 'admin';
