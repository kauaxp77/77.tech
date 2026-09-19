# Levantamento do admin atual (77xp.tech)

**Data:** 19/09/2026
**Por que existe:** o 77xp OS vai construir CRM (etapa 4), propostas (etapa 2) e
clientes (etapa 3). O site já tem essas três coisas funcionando em `/admin`. Antes de
planejar as etapas, é preciso saber exatamente o que já existe, para substituir em vez
de duplicar.

**Método:** leitura do código no repositório. **Nenhuma consulta foi feita ao Supabase
de produção** — os números de quantos leads, reuniões e propostas existem hoje só o
dono consegue ver, no painel do Supabase.

---

## 1. O que o admin faz hoje

| Tela | Arquivo | Linhas | O que faz |
|---|---|---|---|
| Painel | `src/app/admin/(dashboard)/page.tsx` | 346 | Visão geral com números |
| Leads (CRM) | `.../crm/page.tsx` + `KanbanBoard` | 23 + 240 | Quadro kanban, arrasta o lead entre etapas |
| Ficha do lead | `LeadDrawer.tsx` | 208 | Abre o lead, histórico, valor, motivo de perda |
| Propostas | `.../propostas/page.tsx` | 76 | Lista de propostas |
| Proposta | `.../proposal/[id]/page.tsx` | 167 | Gera a proposta de um lead, com botão de imprimir e de pagar |
| Reuniões | `.../reunioes/page.tsx` + `ListaDeReunioes` | 50 + 70 | Agenda e lista reuniões |
| Fila do robô | `SalesbotApprovalQueue.tsx` | 136 | Aprova o que a IA sugeriu |
| Entrar | `.../login/page.tsx` | 72 | Login pelo Supabase Auth |

Total do admin: cerca de **1.500 linhas**.

## 2. O banco (Supabase)

Esquema em `supabase/migrations/20260918120000_esquema_77tech_local.sql`. **Três tabelas:**

### `leads`
```
id, name, email, company, phone, project_type, message,
source (padrão 'Orgânico'), score, priority (ALTA|MEDIA|BAIXA),
sla_deadline, status (NOVO|CONTATO|NEGOCIACAO|FECHADO|PERDIDO),
estimated_value, mrr, arr, loss_reason, created_at
```

### `meetings`
```
id, lead_id (→ leads, on delete cascade), title, meeting_date,
platform, meeting_link, status (padrão SCHEDULED), created_at
```

### `audit_logs`
```
id, entity_type, entity_id, action, user_id, user_email, new_data (jsonb), created_at
```

**Segurança:** RLS ligado. Quem é admin é definido por `app_metadata.role = 'admin'` no
JWT — campo que só o servidor grava. Está correto: `user_metadata` seria editável pelo
próprio usuário. O `middleware.ts` barra `/admin/**` para quem não é admin, e **cada
server action confere de novo** antes de tocar no banco, porque server actions podem ser
chamadas de fora da página. Isso está bem-feito.

## 3. O que roda sozinho

| O quê | Onde | Dispara |
|---|---|---|
| Captura de lead | `POST /api/leads` | Formulário de contato → evento `lead.created` |
| Qualificação por IA | `lib/ai/qualifier.ts` | OpenAI lê a mensagem e dá nota ao lead |
| Aviso por e-mail | EventBus → Resend | E-mail para `COMPANY_ALERT_EMAIL` |
| Aviso no Discord | EventBus → webhook | `lead.created`, `lead.stagnated`, `deal.won` |
| Cobrança | `POST /api/stripe/checkout` + webhook | Pagamento da proposta |
| Rastreio de parado | `GET /api/cron/stagnation` | Cron da Vercel: lead em NEGOCIACAO há 5+ dias |
| Exportar CSV | `GET /api/admin/export/csv` | Baixa os leads |

**Chaves usadas** (todas na Vercel, nenhuma no repositório): `SUPABASE_*`,
`OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`DISCORD_WEBHOOK_URL`, `CRON_SECRET`, `COMPANY_ALERT_EMAIL`.

---

## 4. Três problemas encontrados

### 4.1 Duas tabelas de preço que não batem — e a diferença é de até 8 vezes

A calculadora que **o cliente usa** (`lib/estimationEngine.ts`) e a proposta que **o
admin gera** (`proposal/[id]/page.tsx`) têm tabelas de preço diferentes:

| Tipo de projeto | Calculadora (cliente vê) | Proposta (admin gera) | Diferença |
|---|---:|---:|---:|
| SaaS / Sistemas | R$ 45.000 | R$ 15.000 | **3×** |
| E-commerce | R$ 60.000 | R$ 7.500 | **8×** |
| App mobile | R$ 50.000 | — | — |
| API | R$ 25.000 | — | — |
| Landing | — | R$ 2.500 | — |
| Padrão | R$ 30.000 | R$ 4.000 | 7,5× |

A calculadora ainda aplica multiplicadores (premium 1,4×, enterprise 1,8×, alta
disponibilidade 1,5×, urgente 1,5×) que a proposta ignora por completo.

**O que isso significa na prática:** um cliente que simula um e-commerce vê R$ 60.000 na
calculadora e recebe uma proposta de R$ 7.500. Ou o contrário, dependendo de qual número
chega primeiro. Não é um defeito de código — é uma incoerência comercial, e só o dono
sabe qual dos dois preços é o certo.

**Isto precisa ser decidido antes da etapa 2 (propostas).** Não adianta portar as duas.

### 4.2 Excluir reunião apaga de vez

`deleteMeeting` em `src/app/admin/actions.ts` faz `DELETE` direto na tabela. Isso
contraria a regra do projeto: *"Nunca apagar dados de vez. Arquivar, para dar para
desfazer."* No OS, isso nasce como arquivamento.

### 4.3 O `audit_logs` grava só o depois, nunca o antes

A trilha guarda `new_data`, mas não o valor anterior. Quando um lead muda de R$ 50.000
para R$ 5.000, a trilha registra R$ 5.000 e o valor antigo some. Para desfazer ou
auditar de verdade, falta o `old_data`. O `audit_log` do OS já nasceu diferente.

---

## 5. O que dá para aproveitar no OS

### Aproveita bem (regras de negócio, não código)

| O quê | Linhas | Observação |
|---|---:|---|
| Etapas do funil | — | NOVO → CONTATO → NEGOCIACAO → FECHADO / PERDIDO. Já validado no uso |
| Campos do lead | — | `score`, `priority`, `sla_deadline`, `mrr`, `arr`, `loss_reason`: cada um veio de uma necessidade real |
| Tabela de preços | 83 | `estimationEngine.ts` — **depois de resolver o 4.1** |
| Prompt da IA | 68 | `qualifier.ts` — o texto do prompt é conhecimento seu |
| Regra de estagnação | 49 | 5 dias em NEGOCIACAO dispara aviso |

### Aproveita a tela, reescrevendo o miolo

`KanbanBoard.tsx` (240) e `LeadDrawer.tsx` (208) são `"use client"` e **não importam
nada do `next/`** — a aparência e a interação portam quase direto para o OS. O que muda
é de onde vêm os dados: hoje é server action + Supabase; no OS será a API Java.

### Não aproveita

- `src/lib/supabase/*`, `repositories/`, `services/`: cascas finas em volta do Supabase (≈100 linhas no total). O OS tem PostgreSQL e backend Java próprios.
- Rotas de API (Stripe, webhooks, cron, CSV): vivem no servidor do Next. Viram endpoints Java.
- `src/components/ui/` tem **um** arquivo (`Button.tsx`). Não há sistema de componentes para portar — o OS já tem o seu.

---

## 6. A decisão que não é sobre código

Hoje existe **um** sistema de CRM, no Supabase. O plano do OS constrói **outro**, em
PostgreSQL próprio. Se ninguém decidir, no fim das etapas 2 a 4 haverá dois sistemas
fazendo a mesma coisa, com dados em bancos diferentes, e um deles com os leads de
verdade.

Três caminhos, e nenhum deles é de graça:

**A. O OS substitui o admin.** As etapas 2 a 4 constroem o equivalente, os dados migram
do Supabase para o PostgreSQL do OS, o `/admin` do site é desligado. É o caminho do
plano original. Custo: uma migração de dados, e o site fica sem admin no intervalo.

**B. O admin continua, o OS é outra coisa.** O OS cuida da área do cliente, contratos,
projetos e assinaturas; o CRM continua no Supabase. Custo: dois lugares para entrar,
duas bases de usuários, e a dúvida eterna de onde está cada informação.

**C. Adiar.** Construir o OS sem decidir, e resolver quando doer. Custo: o mais caro dos
três, e o mais provável de acontecer sem querer.

**Recomendação: A**, com uma condição — a migração dos dados entra como tarefa explícita
da etapa 4, com a contagem de leads feita antes, e o `/admin` só sai do ar depois que o
OS estiver fazendo o trabalho por uma semana.

---

## 7. O que falta saber, e só o dono pode responder

1. **Qual tabela de preços é a certa** (item 4.1)?
2. **Quantos leads, reuniões e propostas existem hoje** no Supabase de produção? Isso
   dimensiona a migração e eu não consulto o banco sem autorização.
3. **O admin é usado no dia a dia** ou parou de ser?
4. **Stripe já recebeu pagamento de verdade** por ali, ou está só configurado?
5. **A qualificação por IA (OpenAI) está ligada** e vale a pena manter?
