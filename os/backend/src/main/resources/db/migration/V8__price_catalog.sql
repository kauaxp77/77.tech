-- V8: catálogo de preços. Uma tabela só, no banco, editada pelo dono na tela.
--
-- Antes disto existiam QUATRO tabelas de preço espalhadas em código (a calculadora do
-- site, a proposta do admin, o forecast do painel e a calculadora separada), e as quatro
-- discordavam: um projeto padrão valia R$ 30.000 numa e R$ 1.500 noutra.
--
-- O modelo vem da calculadora separada, que é o único dos quatro que não tem "preço do
-- projeto": ele soma itens. Cada item carrega preço E prazo, porque cliente pergunta
-- as duas coisas juntas.
--
-- Valores em CENTAVOS, inteiros. Dinheiro em ponto flutuante erra no arredondamento.

CREATE TABLE price_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations (id),
    kind        TEXT NOT NULL,
    name        TEXT NOT NULL,
    price_cents BIGINT NOT NULL,
    weeks       INTEGER NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- BASE e DESIGN: escolhe um. EXTRA: escolhe quantos quiser.
    CONSTRAINT price_items_kind_check CHECK (kind IN ('BASE', 'DESIGN', 'EXTRA')),
    CONSTRAINT price_items_price_check CHECK (price_cents >= 0),
    CONSTRAINT price_items_weeks_check CHECK (weeks >= 0)
);

-- Dois itens ativos com o mesmo nome no mesmo grupo confundem quem monta o orçamento.
-- Índice parcial, e não restrição: um item arquivado não impede reusar o nome dele.
CREATE UNIQUE INDEX price_items_active_name_unique
    ON price_items (org_id, kind, name) WHERE active;

CREATE INDEX price_items_listing_idx ON price_items (org_id, kind, sort_order);

CREATE TABLE price_multipliers (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id     UUID NOT NULL REFERENCES organizations (id),
    name       TEXT NOT NULL,
    factor     NUMERIC(5, 2) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Multiplicador abaixo de 1 seria desconto disfarçado; acima de 10 é dedo escorregado.
    CONSTRAINT price_multipliers_factor_check CHECK (factor >= 1.00 AND factor <= 10.00)
);

CREATE UNIQUE INDEX price_multipliers_active_name_unique
    ON price_multipliers (org_id, name) WHERE active;

CREATE INDEX price_multipliers_listing_idx ON price_multipliers (org_id, sort_order);

-- RLS por organização, igual ao resto.
ALTER TABLE price_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_items FORCE ROW LEVEL SECURITY;

CREATE POLICY price_items_org_isolation ON price_items
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

ALTER TABLE price_multipliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_multipliers FORCE ROW LEVEL SECURITY;

CREATE POLICY price_multipliers_org_isolation ON price_multipliers
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- Item de preço não se apaga: arquiva (active = false). Uma proposta antiga precisa
-- continuar explicável, e "esse item não existe mais" não explica nada.
REVOKE DELETE ON price_items FROM app_77xp;
REVOKE DELETE ON price_multipliers FROM app_77xp;

-- Semente: os valores da Calculadora-or-amentos, que é de onde o modelo veio. São ponto
-- de partida, não verdade — o dono edita na tela. Quem instala do zero começa com algo
-- que funciona em vez de uma lista vazia.
INSERT INTO price_items (org_id, kind, name, price_cents, weeks, sort_order)
VALUES ('00000000-0000-4000-8000-000000000001', 'BASE', 'Landing Page Simples', 150000, 1, 1),
       ('00000000-0000-4000-8000-000000000001', 'BASE', 'Landing Page com CMS', 350000, 3, 2),
       ('00000000-0000-4000-8000-000000000001', 'BASE', 'Plataforma SaaS / Sistema', 800000, 8, 3),
       ('00000000-0000-4000-8000-000000000001', 'DESIGN', 'Design Base (Template)', 0, 0, 1),
       ('00000000-0000-4000-8000-000000000001', 'DESIGN', 'Design Exclusivo', 150000, 2, 2),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'Gateway de pagamento', 100000, 1, 1),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'Login de usuários', 200000, 1, 2),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'Painel administrativo', 150000, 2, 3),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'SEO', 80000, 1, 4),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'CRM', 80000, 1, 5),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'Animações', 120000, 1, 6),
       ('00000000-0000-4000-8000-000000000001', 'EXTRA', 'Hospedagem (1 ano)', 60000, 0, 7);

INSERT INTO price_multipliers (org_id, name, factor, sort_order)
VALUES ('00000000-0000-4000-8000-000000000001', 'Freelancer', 1.00, 1),
       ('00000000-0000-4000-8000-000000000001', 'Agência', 1.80, 2);
