-- V3: identidade global e vínculo com organizações.
--
-- users é global (a mesma pessoa pode estar em várias organizações) e não tem RLS.
-- O papel da pessoa em cada organização vive só em memberships.role, no servidor,
-- junto com a situação do vínculo (o bloqueio vale para a organização) e o último acesso.
-- Contas só nascem por convite ou pelo comando de inicialização (D10).

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    name          TEXT,
    -- Vazio até a pessoa criar a senha pelo link de primeiro acesso.
    password_hash TEXT,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'BLOCKED')),
    CONSTRAINT users_email_lowercase_check CHECK (email = lower(email))
);

-- E-mail sempre minúsculo e sem espaços: "Fulano@x.com" e "fulano@x.com " não
-- podem virar duas contas. search_path fixo (lição da V22 do Beto_Banco).
CREATE FUNCTION users_normalize_email() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_normalize_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION users_normalize_email();

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE memberships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    org_id        UUID NOT NULL REFERENCES organizations (id),
    role          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT memberships_role_check CHECK (role IN ('OWNER', 'ADMIN', 'TEAM', 'CLIENT')),
    CONSTRAINT memberships_status_check CHECK (status IN ('ACTIVE', 'BLOCKED')),
    CONSTRAINT memberships_user_org_unique UNIQUE (user_id, org_id)
);

CREATE INDEX memberships_org_id_idx ON memberships (org_id);
