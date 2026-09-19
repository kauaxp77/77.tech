-- V5: tokens de sessão e de definição de senha.
--
-- Nenhum valor de token é guardado em claro: só o SHA-256. Ficam ligados à pessoa
-- (identidade global), sem RLS de organização. A sessão guarda a organização em
-- que nasceu, usada para emitir o novo access token na renovação.

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES organizations (id),
    -- Cadeia de rotações de um mesmo login (um aparelho).
    family_id   UUID NOT NULL,
    token_hash  TEXT NOT NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens (id),
    user_agent  TEXT,
    ip          TEXT,
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);

-- Primeiro acesso e redefinição de senha: o mesmo mecanismo com finalidade e prazo diferentes.
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    purpose    TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash),
    CONSTRAINT password_reset_tokens_purpose_check CHECK (purpose IN ('FIRST_ACCESS', 'RESET'))
);

CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);
