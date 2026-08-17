-- PATCH DE ATUALIZACAO SPRINT 7A: CRM INTELLIGENCE
-- Este script altera a estrutura do banco sem apagar nenhum cliente existente.

ALTER TABLE public.leads
ADD COLUMN
IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN
IF NOT EXISTS priority TEXT DEFAULT 'BAIXA' CHECK
(priority IN
('ALTA', 'MEDIA', 'BAIXA')),
ADD COLUMN
IF NOT EXISTS sla_deadline TIMESTAMP
WITH TIME ZONE,
ADD COLUMN
IF NOT EXISTS source TEXT DEFAULT 'Orgânico';

-- Preencher leads antigos (se existirem) com SLA retroativo padrão para evitar crash de dashboard
UPDATE public.leads 
SET 
  score = 50, 
  priority = 'BAIXA', 
  sla_deadline = created_at + interval
'24 hours' 
WHERE score IS NULL;
