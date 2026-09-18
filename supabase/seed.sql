-- DADOS DE EXEMPLO — SÓ PARA O AMBIENTE LOCAL (npx supabase db reset)
-- Nada daqui vai para produção.

-- Contas de teste (senhas válidas só neste banco local):
--   admin@77xp.local   / admin-local-77    → admin de verdade (app_metadata.role = admin)
--   intruso@77xp.local / intruso-local-77  → se declarou admin no próprio perfil (deve ser barrado)
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
) values
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
     'authenticated', 'authenticated', 'admin@77xp.local',
     extensions.crypt('admin-local-77', extensions.gen_salt('bf')), now(),
     '{"provider": "email", "providers": ["email"], "role": "admin"}', '{}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
     'authenticated', 'authenticated', 'intruso@77xp.local',
     extensions.crypt('intruso-local-77', extensions.gen_salt('bf')), now(),
     '{"provider": "email", "providers": ["email"]}', '{"role": "admin"}', now(), now(), '', '', '', '');

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
    ('11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
     '{"sub": "11111111-1111-4111-8111-111111111111", "email": "admin@77xp.local", "email_verified": true}',
     'email', now(), now(), now()),
    ('22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222',
     '{"sub": "22222222-2222-4222-8222-222222222222", "email": "intruso@77xp.local", "email_verified": true}',
     'email', now(), now(), now());

-- Leads em todas as etapas do funil
insert into public.leads (id, name, email, company, phone, project_type, message, source, score, priority, sla_deadline, status, estimated_value, mrr, loss_reason, created_at) values
    ('a0000000-0000-4000-8000-000000000001', 'Ana Souza', 'ana@clinicavida.com.br', 'Clínica Vida', '61999990001', 'saas',
     'Precisamos de um sistema de agendamento com lembrete por WhatsApp para 3 unidades.', 'calculadora', 82, 'ALTA',
     now() + interval '1 hour', 'NOVO', null, null, null, now() - interval '2 hours'),
    ('a0000000-0000-4000-8000-000000000002', 'Bruno Lima', 'bruno@padarialima.com', 'Padaria Lima', '61999990002', 'landing_page',
     'Quero uma página para divulgar encomendas de bolos e salgados.', 'instagram', 35, 'BAIXA',
     now() - interval '3 hours', 'NOVO', null, null, null, now() - interval '1 day'),
    ('a0000000-0000-4000-8000-000000000003', 'Carla Mendes', 'carla@mendesadv.com.br', 'Mendes Advocacia', '61999990003', 'api',
     'Integração do nosso sistema jurídico com o PJe para acompanhar processos.', 'website_contact_form', 64, 'MEDIA',
     now() + interval '5 hours', 'NOVO', null, null, null, now() - interval '30 minutes'),
    ('a0000000-0000-4000-8000-000000000004', 'Diego Rocha', 'diego@rochalog.com', 'Rocha Logística', '61999990004', 'saas',
     'Painel para rastrear entregas e motoristas em tempo real.', 'google', 71, 'ALTA',
     null, 'CONTATO', 45000, null, null, now() - interval '6 days'),
    ('a0000000-0000-4000-8000-000000000005', 'Elisa Prado', 'elisa@pradomoda.com', 'Prado Moda', '61999990005', 'other',
     'Loja virtual com catálogo e pagamento por PIX.', 'indicação', 58, 'MEDIA',
     null, 'CONTATO', 18000, null, null, now() - interval '9 days'),
    ('a0000000-0000-4000-8000-000000000006', 'Felipe Castro', 'felipe@castroimoveis.com', 'Castro Imóveis', '61999990006', 'saas',
     'CRM para corretores com funil de vendas e contratos.', 'google', 88, 'ALTA',
     null, 'NEGOCIACAO', 52000, 1500, null, now() - interval '12 days'),
    ('a0000000-0000-4000-8000-000000000007', 'Gabriela Nunes', 'gabriela@nunesfit.com', 'Nunes Fit', '61999990007', 'landing_page',
     'Site para academia com matrícula online.', 'instagram', 49, 'MEDIA',
     null, 'NEGOCIACAO', 6500, 300, null, now() - interval '18 days'),
    ('a0000000-0000-4000-8000-000000000008', 'Henrique Alves', 'henrique@alvesauto.com', 'Alves Auto Center', '61999990008', 'saas',
     'Sistema de ordens de serviço para oficina.', 'website_contact_form', 76, 'ALTA',
     null, 'FECHADO', 38000, 900, null, now() - interval '25 days'),
    ('a0000000-0000-4000-8000-000000000009', 'Isabela Freitas', 'isabela@freitaseventos.com', 'Freitas Eventos', '61999990009', 'landing_page',
     'Página de eventos com venda de ingressos.', 'indicação', 55, 'MEDIA',
     null, 'FECHADO', 7200, null, null, now() - interval '28 days'),
    ('a0000000-0000-4000-8000-000000000010', 'João Batista', 'joao@batistaagro.com', 'Batista Agro', '61999990010', 'infra',
     'Migrar servidores para a nuvem.', 'google', 42, 'MEDIA',
     null, 'PERDIDO', 25000, null, 'Orçamento', now() - interval '20 days');

-- Reuniões: duas próximas e uma que já passou
insert into public.meetings (lead_id, title, meeting_date, platform, meeting_link, status) values
    ('a0000000-0000-4000-8000-000000000006', 'Apresentação da proposta — Castro Imóveis', now() + interval '1 day', 'Google Meet', 'https://meet.google.com/abc-defg-hij', 'SCHEDULED'),
    ('a0000000-0000-4000-8000-000000000004', 'Levantamento de requisitos — Rocha Logística', now() + interval '3 days', 'Zoom', 'https://zoom.us/j/123456789', 'SCHEDULED'),
    ('a0000000-0000-4000-8000-000000000007', 'Alinhamento de escopo — Nunes Fit', now() - interval '2 days', 'Google Meet', 'https://meet.google.com/xyz-abcd-efg', 'SCHEDULED');

-- Histórico de movimentações
insert into public.audit_logs (entity_type, entity_id, action, user_id, user_email, new_data, created_at) values
    ('lead', 'a0000000-0000-4000-8000-000000000006', 'STATUS_CHANGED_TO_CONTATO', '11111111-1111-4111-8111-111111111111', 'admin@77xp.local', '{"status": "CONTATO"}', now() - interval '10 days'),
    ('lead', 'a0000000-0000-4000-8000-000000000006', 'STATUS_CHANGED_TO_NEGOCIACAO', '11111111-1111-4111-8111-111111111111', 'admin@77xp.local', '{"status": "NEGOCIACAO"}', now() - interval '4 days'),
    ('lead', 'a0000000-0000-4000-8000-000000000008', 'STATUS_CHANGED_TO_FECHADO', '11111111-1111-4111-8111-111111111111', 'admin@77xp.local', '{"status": "FECHADO"}', now() - interval '15 days');
