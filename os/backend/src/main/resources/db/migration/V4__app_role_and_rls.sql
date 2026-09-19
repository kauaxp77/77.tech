-- V4: papel da aplicação, permissões padrão e RLS por organização.
--
-- Vem antes das demais tabelas para cada tabela nova já nascer com as permissões
-- certas. A aplicação conecta como app_77xp: sem BYPASSRLS e sem ser dona de
-- nada, então o RLS vale para ela. As migrações rodam como o dono.
--
-- A senha NUNCA fica aqui. O papel é criado antes do Flyway: nos testes pelo
-- script do Testcontainers, no local pelo init do docker compose e no Supabase
-- pelo passo a passo de publicação. Este bloco só garante que ele exista.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_77xp') THEN
        CREATE ROLE app_77xp LOGIN NOBYPASSRLS;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_77xp;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_77xp;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_77xp;

-- Tabelas e sequências criadas depois (pelo mesmo dono, nas próximas migrações).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_77xp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_77xp;

-- O histórico do Flyway é só do dono: a aplicação não lê nem escreve nele.
REVOKE ALL ON TABLE flyway_schema_history FROM app_77xp;

-- RLS por organização. Sem organização informada, nada aparece e nada é gravado.
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_org_isolation ON memberships
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
