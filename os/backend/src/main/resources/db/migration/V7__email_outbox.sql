-- V7: fila de e-mail (outbox). Fila do sistema, processada em segundo plano sem
-- organização no contexto: por isso não tem RLS. org_id fica como referência
-- (quem enfileirou), para relatório e para templates por organização no futuro.
CREATE TABLE email_outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations (id),
    to_address      TEXT NOT NULL,
    template        TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    dedup_key       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT email_outbox_status_check CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0),
    CONSTRAINT email_outbox_dedup_key_unique UNIQUE (dedup_key)
);

CREATE INDEX email_outbox_pending_idx ON email_outbox (next_attempt_at) WHERE status = 'PENDING';
