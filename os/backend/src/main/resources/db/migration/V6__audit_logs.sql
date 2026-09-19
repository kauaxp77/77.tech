-- V6: auditoria. Tabela de organização (RLS) e só de inserção para a aplicação.
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations (id),
    -- Sem chave estrangeira de propósito: o registro sobrevive à pessoa.
    actor_user_id UUID,
    action        TEXT NOT NULL,
    entity_type   TEXT,
    entity_id     TEXT,
    ip            TEXT,
    user_agent    TEXT,
    result        TEXT NOT NULL DEFAULT 'SUCCESS',
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_result_check CHECK (result IN ('SUCCESS', 'FAILURE'))
);

CREATE INDEX audit_logs_org_created_idx ON audit_logs (org_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_org_isolation ON audit_logs
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- Só inserção: as permissões padrão da V4 deram UPDATE e DELETE; aqui elas saem.
REVOKE UPDATE, DELETE ON audit_logs FROM app_77xp;
