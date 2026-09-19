# Características a preservar no 77xp OS

**Data:** 19/09/2026
**Origem:** pedido do dono — *"quero que esse sistema ainda tenha todas essas
características"*, apontando o `README.md` da branch `main`.

**O que este documento é:** cada característica descrita no README conferida **contra o
código**, dizendo em que etapa do OS ela nasce. Não é a lista do README repetida — é a
lista do que existe de verdade, que é o que precisa ser preservado.

**Consequência imediata:** isto responde a pergunta que estava em aberto. O OS **vai
substituir** o `/admin` atual, não conviver com ele. Nada se preserva por cópia: cada
característica é reconstruída sobre o backend Java e conferida contra o comportamento
atual.

---

## 1. O que existe, e onde nasce no OS

| # | Característica | Existe hoje? | Etapa do OS |
|---|---|---|---|
| 1 | Calculadora de projeto que vira lead | Sim, `estimationEngine.ts` + `/calculadora` | 2 |
| 2 | Cases e Blog servidos de `lib/data.ts`, sem CMS | Sim | Site (fica onde está) |
| 3 | Ticket médio (ACV) e forecast de pipeline | Sim, `page.tsx` do dashboard | 4 |
| 4 | Alerta de SLA no funil | Sim, **com três prazos diferentes** (ver 2.2) | 4 |
| 5 | Ciclo de negócio (sales velocity) | Sim | 4 |
| 6 | Exportar CSV com BOM para Excel/Power BI | Sim, BOM conferido no código | 4 |
| 7 | Kanban com arrastar e soltar | Sim, e é **otimista de verdade** (`useOptimistic`) | 4 |
| 8 | Gaveta do lead com linha do tempo | Sim, `LeadDrawer.tsx` | 4 |
| 9 | Motivo da perda obrigatório ao mover para PERDIDO | Sim | 4 |
| 10 | Agendar reunião a partir do card | Sim, tabela `meetings` | 4 |
| 11 | Link de pagamento Stripe + webhook fecha o lead | Sim | 2 (cobrança) / 4 (gatilho) |
| 12 | Trilha de auditoria que ninguém apaga | Sim, `audit_logs` | **Já existe no OS** |
| 13 | IA: rascunho de e-mail de vendas | Sim, `qualifier.ts` + `SalesbotApprovalQueue` | 4 |
| 14 | IA: prompt de arquitetura (blueprint) | Sim, segunda aba da fila | 4 |
| 15 | Aprovação humana antes de disparar (human-in-the-loop) | Sim | 4 |
| 16 | Event Bus (pub/sub) que não trava a tela | Sim, `EventBus.ts` | 3 ou 4 |
| 17 | Alertas no Discord | Sim, webhook | 4 |
| 18 | Proposta em PDF A4 pelo navegador | Sim, `window.print()` + CSS de impressão | 2 |
| 19 | Atalho de WhatsApp a partir do telefone do lead | Sim, no `LeadDrawer` | 4 |

**Duas já estão prontas no OS**, construídas na etapa 1:

- **Trilha de auditoria** (#12) — e a do OS é melhor: ver 2.3.
- **Separação por organização com RLS** — o admin atual usa RLS por papel de admin; o OS
  separa por organização, o que o admin atual não faz.

---

## 2. Onde o README e o código discordam

O README é texto de vitrine. Conferindo contra o código, três coisas não batem — e as
três importam.

### 2.1 Três tabelas de preço, não duas

O levantamento anterior achou duas. Existe uma terceira, e é a pior das três, porque é a
que gera os **números que você usa para decidir**:

| Projeto | Calculadora (cliente vê) | Proposta (você manda) | **Dashboard (ACV/forecast)** |
|---|---:|---:|---:|
| SaaS / Sistemas | R$ 45.000 | R$ 15.000 | R$ 15.000 |
| E-commerce | R$ 60.000 | R$ 7.500 | R$ 8.000 |
| Escalonável | — | — | R$ 4.000 |
| Landing | — | R$ 2.500 | R$ 2.500 |
| Padrão | R$ 30.000 | R$ 4.000 | **R$ 1.500** |

`src/lib/estimationEngine.ts`, `src/app/admin/(dashboard)/proposal/[id]/page.tsx:26-40`,
`src/app/admin/(dashboard)/page.tsx:30-37`.

**Por que isto é o item mais grave desta lista:** o "Gross Pipeline Forecast" e o "Ticket
Médio (ACV)" do seu painel são calculados com a terceira tabela. Se o padrão real for
R$ 30.000 e o painel usar R$ 1.500, o seu forecast está **vinte vezes menor** do que a
realidade. Se for o contrário, está inflado.

Nenhuma das três é "a certa" por ser mais nova ou mais detalhada. **Só você sabe.**

### 2.2 O SLA tem três prazos diferentes

| Onde | Prazo | O que faz |
|---|---|---|
| README | 15 dias | Diz que há "bloqueio automático" |
| Painel (`page.tsx:88-91`) | **mais de 15 dias** | Mostra a faixa vermelha de alerta |
| Cron (`stagnation/route.ts:37`) | **5 ou mais dias** | Dispara o aviso no Discord |

Um lead parado há 7 dias **manda alerta no Discord e não aparece na faixa vermelha do
painel**. São dois sistemas de alerta que discordam sobre o que é um lead estagnado.

E o "bloqueio automático" que o README promete **não existe** — nada é bloqueado. O
sistema avisa, e só.

### 2.3 A trilha de auditoria guarda menos do que parece

`audit_logs` grava `new_data`, nunca o valor anterior. Quando um lead muda de R$ 50.000
para R$ 5.000, a trilha diz "virou R$ 5.000" e o valor antigo some para sempre.

O `audit_log` do OS já nasceu diferente na etapa 1 — esta é uma das duas características
que o OS **melhora** em vez de só copiar.

---

## 3. O que muda no caminho do projeto

Antes deste pedido, as etapas 2 a 4 iam construir "propostas, clientes e CRM" sem
referência concreta. Agora têm uma: **a lista de 19 itens acima é o critério de pronto.**

O OS só substitui o `/admin` quando fizer os 19, não antes.

Isso **aumenta** o tamanho das etapas 2 a 4 em relação ao que estava no ar até aqui.
Itens que não estavam previstos em plano nenhum e agora estão:

- Exportação CSV com BOM (#6)
- Atalho de WhatsApp (#19)
- Alertas no Discord (#17)
- As duas frentes de IA (#13, #14) com fila de aprovação humana (#15)
- Proposta em PDF pelo navegador (#18)
- Kanban otimista (#7) — arrastar e a tela responder na hora, sem esperar o servidor

Nenhum deles é difícil sozinho. Juntos, são trabalho de verdade, e é melhor saber agora.

---

## 4. O que precisa ser decidido antes da etapa 2

1. **Qual tabela de preços vale** (2.1). Enquanto houver três, qualquer coisa que eu
   construir herda a contradição — e agora sabemos que o seu forecast depende disso.
2. **Qual prazo de SLA vale** (2.2): 5 dias, 15 dias, ou outro. E se "bloqueio
   automático" deve existir de verdade ou se o README promete demais.
3. **A IA continua com a OpenAI** ou muda de provedor? Isso muda chave, custo e o
   desenho da fila de aprovação.
4. **O Stripe já recebeu pagamento de verdade**? Se sim, a migração precisa cuidar dos
   registros de cobrança, não só dos leads.
