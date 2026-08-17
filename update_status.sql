ALTER TABLE public.leads 
ADD COLUMN
IF NOT EXISTS status TEXT DEFAULT 'NOVO' 
CHECK
(status IN
('NOVO', 'CONTATO', 'NEGOCIACAO', 'FECHADO', 'PERDIDO'));

-- Cria a Política de Segurança (RLS) habilitando a proteção
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Permite ao site público e backend (Service Key) inserir novos formulários
CREATE POLICY "Permitir insercoes anonimas" ON public.leads
    FOR
INSERT
    WITH CHECK
    (true)
;

-- Permite apenas Administradores autenticados lerem e alterarem o CRM
CREATE POLICY "Permitir leitura para administradores" ON public.leads
    FOR
SELECT
    USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Permitir update para administradores" ON public.leads
    FOR UPDATE
    USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');
