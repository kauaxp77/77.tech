# Etapa 2 — Plano 1: Tabela de preços editável — Plano de implementação

**Objetivo:** acabar com as quatro tabelas de preço espalhadas pelo código e pôr **uma
só**, guardada no banco e editada pelo dono na tela, a qualquer momento, sem depender de
ninguém.

**Pedido do dono, palavra por palavra:** *"crie a tabela que já tem, porém quero editar
ela quando eu quiser"*, apontando `github.com/kauaxp77/Calculadora-or-amentos` como base.

**Por que isto vem antes de propostas:** uma proposta é uma tabela de preços aplicada a
um cliente. Construir proposta antes de resolver o preço é construir sobre areia — e hoje
existem **quatro** tabelas que discordam entre si.

---

## O problema que este plano resolve

| Onde | SaaS/Sistema | E-commerce | Landing | Padrão |
|---|---:|---:|---:|---:|
| `lib/estimationEngine.ts` (calculadora do site) | R$ 45.000 | R$ 60.000 | — | R$ 30.000 |
| `proposal/[id]/page.tsx` (proposta que você manda) | R$ 15.000 | R$ 7.500 | R$ 2.500 | R$ 4.000 |
| `admin/(dashboard)/page.tsx` (seu forecast) | R$ 15.000 | R$ 8.000 | R$ 2.500 | R$ 1.500 |
| Calculadora-or-amentos (a do repositório separado) | R$ 8.000 | — | R$ 1.500 | — |

Quatro respostas para a mesma pergunta. Depois deste plano, **uma**, e no banco.

---

## O modelo, vindo da sua calculadora

A calculadora separada é a melhor das quatro porque **não tem "preço do projeto"**: ela
soma itens. É esse o modelo:

| Grupo | Como escolhe | Exemplos de hoje |
|---|---|---|
| **Base** | um só | Landing Simples R$ 1.500 / 1 sem · Landing com CMS R$ 3.500 / 3 sem · Plataforma SaaS R$ 8.000 / 8 sem |
| **Design** | um só | Template R$ 0 / 0 sem · Exclusivo R$ 1.500 / 2 sem |
| **Extras** | quantos quiser | Gateway R$ 1.000 · Login R$ 2.000 · Admin R$ 1.500 · SEO R$ 800 · CRM R$ 800 · Animações R$ 1.200 · Hospedagem R$ 600 |
| **Multiplicador** | um só | Freelancer 1,0× · Agência 1,8× (vira a linha "Taxa de Agência") |
| **Personalizados** | quantos quiser | escritos na hora, não ficam no catálogo |
| **Desconto/acréscimo** | um, em % | aplicado sobre o subtotal |

Cada item carrega **preço e prazo em semanas**, então o orçamento sai com valor e prazo
juntos — que é como cliente pergunta.

---

## Restrições globais

- Preço é **dado**, nunca código. Depois deste plano, nenhum número de preço fica em
  arquivo `.ts` ou `.java`.
- Valores em **centavos, inteiros**. Dinheiro em ponto flutuante erra no arredondamento,
  e erra sempre a favor de ninguém.
- **Nada se apaga.** Item de preço que sai de uso é arquivado (`active = false`). Uma
  proposta antiga precisa continuar mostrando o que foi cobrado, não o preço de hoje.
- **Preço de proposta emitida não muda.** A proposta guarda os valores do dia em que foi
  feita, copiados. Mudar a tabela não pode reescrever o passado.
- Só `OWNER` e `ADMIN` editam a tabela. A API recusa o resto; a tela esconde por conforto.
- Toda alteração de preço entra na trilha de auditoria, **com o valor anterior** — a
  trilha do OS guarda o antes, ao contrário da do admin atual.
- TDD: teste que falha primeiro. A tarefa fecha com backend e frontend verdes.

---

## Tarefas

### Tarefa 1: Tabela no banco

**Arquivos:** `V8__price_catalog.sql`, entidades `PriceItem` e `PriceMultiplier`.

**Regras:**
- `price_items`: `id`, `org_id`, `kind` (BASE | DESIGN | EXTRA), `name`, `price_cents`
  (inteiro), `weeks` (inteiro), `sort_order`, `active`, `created_at`, `updated_at`.
- `price_multipliers`: `id`, `org_id`, `name`, `factor` (numeric 4,2), `sort_order`,
  `active`.
- RLS por organização nas duas, como todas as outras tabelas.
- Semente com os valores de hoje da sua calculadora — o dono edita depois. A semente é
  migração, não script solto: quem instalar o sistema do zero começa com algo utilizável.

**Prova:** RLS esconde item de outra organização; `price_cents` recusa valor negativo;
arquivar não apaga a linha.

---

### Tarefa 2: API do catálogo

**Arquivos:** `catalog/` (controller, service, DTOs).

**Rotas:**
- `GET /catalog/items` — lista (inclui arquivados só se pedir)
- `POST /catalog/items` — cria
- `PUT /catalog/items/{id}` — edita
- `POST /catalog/items/{id}/archive` e `/restore`
- Mesmo conjunto para `/catalog/multipliers`
- `PUT /catalog/items/order` — reordenar

**Regras:** toda escrita audita com valor anterior e novo. Nome repetido dentro do mesmo
grupo devolve 409 no campo do nome.

**Prova:** TEAM recebe 403; edição registra antes e depois na trilha; nome repetido dá
409 no campo certo; arquivar some da lista padrão e continua em `?incluirArquivados=true`.

---

### Tarefa 3: Motor de cálculo, no backend

**Arquivos:** `catalog/service/QuoteCalculator.java`.

**Regras:** recebe as escolhas, devolve as linhas, o subtotal, a taxa do multiplicador, o
desconto, o total e o prazo em semanas. **Aritmética inteira, em centavos.**

**Por que no backend e não na tela:** a calculadora pública e a proposta do painel têm de
dar o mesmo número. Duas implementações voltariam a divergir — que é exatamente a doença
que este plano está curando.

**Prova:** os casos da sua calculadora conferem centavo a centavo; multiplicador de 1,8×
sobre R$ 8.000 dá R$ 14.400 e a linha "Taxa de Agência" mostra R$ 6.400; desconto de 10%
incide sobre o subtotal, não sobre o total com taxa; arredondamento nunca perde centavo.

---

### Tarefa 4: Tela de edição (`/painel/precos`)

**Arquivos:** `pages/panel/Precos.tsx`, `api/catalog.ts`, hooks.

**Regras:** três seções (Base, Design, Extras) e os multiplicadores. Editar na própria
linha, sem tela separada. Preço em reais na tela, centavos por baixo. Arrastar para
reordenar. Arquivar pede confirmação e diz que propostas antigas não mudam.

**Prova:** editar um preço e ver a lista atualizar; arquivar tira da lista; 403 vira aviso
na tela; valor com vírgula e com ponto funcionam.

---

### Tarefa 5: Simulador (`/painel/orcamento`)

**Arquivos:** `pages/panel/Orcamento.tsx`.

Monta um orçamento escolhendo itens, mostra o resumo com valor e prazo, e permite itens
personalizados. É a sua calculadora, agora lendo a tabela de verdade.

**Prova:** o total confere com o que o backend calcula; item personalizado entra na conta
sem ir para o catálogo.

---

### Tarefa 6: Aposentar as tabelas espalhadas

**Regras:** um teste falha se aparecer número de preço escrito em código no `os/`. É o
que impede a quinta tabela de nascer.

As três do site Next.js (`estimationEngine`, proposta, dashboard) **não são tocadas
agora** — elas morrem quando o OS substituir o `/admin`, na etapa 4. Até lá o site
continua como está.

**Prova:** o teste falha se alguém escrever um preço em código; passa no estado atual.

---

## O que este plano NÃO faz

- Não gera proposta em PDF (plano 2 da etapa 2).
- Não manda proposta para o cliente nem cobra pelo Stripe (plano 3 da etapa 2).
- Não toca no site 77xp.tech nem nas três tabelas dele.
- Não decide **quais** preços são os certos. Ele coloca os de hoje da sua calculadora
  como ponto de partida e te dá a tela para corrigir cada um. Essa parte é sua, e agora
  leva um minuto em vez de um pedido de alteração.
