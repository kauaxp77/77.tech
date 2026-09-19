-- V2: organizações, a base do white-label. Tabela global (sem RLS): o acesso
-- passa só pelo módulo organizations.
CREATE TABLE organizations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL,
    domain     TEXT,
    theme      JSONB NOT NULL DEFAULT '{}'::jsonb,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organizations_slug_unique UNIQUE (slug),
    CONSTRAINT organizations_domain_unique UNIQUE (domain),
    CONSTRAINT organizations_slug_format_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT organizations_domain_lowercase_check CHECK (domain = lower(domain))
);

-- Organização raiz com id fixo: o código a referencia por constante
-- (RootOrganization.ID), sem uma consulta a mais por requisição.
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000001', '77xp', '77xp');
