-- PASSO 2 — TROCAR AS REGRAS DE ACESSO (RLS) PARA O CAMPO SEGURO
-- Rode só DEPOIS do passo 1. Se nenhuma conta estiver marcada como admin do jeito
-- seguro, este script para sozinho com erro, para você não ficar trancado fora.
-- Pode rodar mais de uma vez sem problema.

do $$
declare
    regra record;
    total int := 0;
begin
    if not exists (select 1 from auth.users where raw_app_meta_data ->> 'role' = 'admin') then
        raise exception 'Nenhuma conta com app_metadata.role = admin. Rode o PASSO 1 antes.';
    end if;

    for regra in
        select schemaname, tablename, policyname, qual, with_check
        from pg_policies
        where coalesce(qual, '') like '%user_metadata%'
           or coalesce(with_check, '') like '%user_metadata%'
    loop
        if regra.qual is not null then
            execute format('alter policy %I on %I.%I using (%s)',
                regra.policyname, regra.schemaname, regra.tablename,
                replace(regra.qual, 'user_metadata', 'app_metadata'));
        end if;
        if regra.with_check is not null then
            execute format('alter policy %I on %I.%I with check (%s)',
                regra.policyname, regra.schemaname, regra.tablename,
                replace(regra.with_check, 'user_metadata', 'app_metadata'));
        end if;
        total := total + 1;
        raise notice 'Regra atualizada: %.% (%)', regra.schemaname, regra.tablename, regra.policyname;
    end loop;

    raise notice 'Pronto: % regra(s) agora usam app_metadata.', total;
end $$;

-- Conferência: não deve aparecer nenhuma linha.
select schemaname, tablename, policyname
from pg_policies
where coalesce(qual, '') like '%user_metadata%'
   or coalesce(with_check, '') like '%user_metadata%';
