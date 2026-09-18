-- Verificações depois dos passos 1 e 2. Qualquer ASSERT que falhar interrompe com erro.

-- 1) Nenhuma regra de acesso usa mais o campo que o usuário consegue editar
do $$ begin
    assert not exists (
        select 1 from pg_policies
        where coalesce(qual, '') like '%user_metadata%' or coalesce(with_check, '') like '%user_metadata%'
    ), 'ainda existe regra de acesso usando user_metadata';
end $$;

-- 2) Admin de verdade (papel no app_metadata do token) vê e altera os dados
begin;
set local role authenticated;
do $$ begin
    perform set_config('request.jwt.claims',
        '{"role": "authenticated", "email": "admin@77xp.com", "app_metadata": {"role": "admin"}, "user_metadata": {}}', true);
end $$;
do $$ begin
    assert (select count(*) from public.leads) = 2, 'o admin deveria ver os 2 leads';
    assert (select count(*) from public.meetings) = 1, 'o admin deveria ver a reunião';
end $$;
update public.leads set status = 'CONTATO' where email = 'ana@cliente.com';
do $$ begin
    assert (select status from public.leads where email = 'ana@cliente.com') = 'CONTATO', 'o admin deveria conseguir mover o lead';
end $$;
rollback;

-- 3) Intruso (se declarou admin no próprio perfil) não vê nem altera nada
begin;
set local role authenticated;
do $$ begin
    perform set_config('request.jwt.claims',
        '{"role": "authenticated", "email": "intruso@exemplo.com", "app_metadata": {}, "user_metadata": {"role": "admin"}}', true);
end $$;
do $$ begin
    assert (select count(*) from public.leads) = 0, 'o intruso NÃO deveria ver leads';
    assert (select count(*) from public.meetings) = 0, 'o intruso NÃO deveria ver reuniões';
end $$;
update public.leads set status = 'FECHADO';
delete from public.meetings;
reset role;
do $$ begin
    assert (select count(*) from public.leads where status = 'FECHADO') = 0, 'o intruso NÃO deveria alterar leads';
    assert (select count(*) from public.meetings) = 1, 'o intruso NÃO deveria apagar reuniões';
end $$;
rollback;

-- 4) O formulário do site (visitante anônimo) continua criando leads
begin;
set local role anon;
do $$ begin
    perform set_config('request.jwt.claims', '{"role": "anon"}', true);
end $$;
insert into public.leads (name, email) values ('Carla', 'carla@cliente.com');
rollback;
