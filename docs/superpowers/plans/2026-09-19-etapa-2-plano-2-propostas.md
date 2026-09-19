# Etapa 2 — Plano 2: Propostas — Plano de implementação

**Objetivo:** transformar um orçamento montado numa **proposta** — um documento com
número, destinatário e validade, que pode ser impresso em PDF pelo navegador e enviado
ao cliente.

**Vem do plano 1 desta etapa**, que já entregou a tabela de preços e o simulador. Este
plano pega o que o simulador calcula e congela num documento.

**Características que este plano cobre** (da lista em
`levantamentos/2026-09-19-caracteristicas-a-preservar.md`):

- #18 Proposta em PDF A4 pelo navegador, com assinatura
- #19 Atalho de WhatsApp para mandar a proposta

---

## A regra que manda em tudo aqui

**Proposta emitida não muda de preço.** Nunca.

Se a proposta guardar só "item 3 do catálogo" e alguém editar o preço do item 3 amanhã,
a proposta que o cliente recebeu passa a dizer outro valor. Isso é fraude, mesmo sem
ninguém querer.

Então a proposta **copia** as linhas: nome, valor e prazo do dia em que foi feita. A
tabela de preços pode mudar à vontade depois.

Consequência prática: não há chave estrangeira de `proposal_lines` para `price_items`.
A ausência dela é de propósito, e vai comentada na migração.

---

## Restrições globais

- Tudo em centavos, inteiros, como no plano 1.
- **O total é recalculado no backend** na hora de emitir, com o `QuoteCalculator`. O
  número que a tela mostrou não é confiável: quem manda o pedido pode ter mexido nele.
- Proposta não se apaga: arquiva.
- Número da proposta é **sequencial por organização** e nunca se repete, mesmo se uma
  for arquivada. Cliente pergunta "a proposta 12"; não pode haver duas.
- A página de impressão é **pública por link com segredo** — o cliente não tem conta
  ainda quando recebe a proposta. O link tem um token longo e aleatório, e a página não
  mostra nada além daquela proposta.
- TDD: teste que falha primeiro.

---

## Tarefas

### Tarefa 1: Tabela de propostas

**Arquivos:** `V9__proposals.sql`, entidades `Proposal` e `ProposalLine`.

**Regras:**
- `proposals`: `id`, `org_id`, `number` (inteiro, sequencial por organização),
  `public_token` (aleatório, único), `client_name`, `client_email`, `client_phone`,
  `status` (RASCUNHO | ENVIADA | ACEITA | RECUSADA | EXPIRADA), `subtotal_cents`,
  `multiplier_fee_cents`, `discount_cents`, `total_cents`, `weeks`, `valid_until`,
  `notes`, `created_at`, `updated_at`, `active`.
- `proposal_lines`: `id`, `proposal_id`, `name`, `price_cents`, `weeks`, `sort_order`.
  **Sem referência a `price_items`** — ver a regra acima.
- RLS por organização em `proposals`. Em `proposal_lines`, isolamento pela proposta.
- Número sequencial: sequência por organização, obtida dentro da transação que cria a
  proposta. Duas propostas criadas ao mesmo tempo não podem receber o mesmo número.

**Prova:** duas propostas criadas em paralelo recebem números diferentes; RLS esconde
proposta de outra organização; arquivar não apaga; o número não é reusado depois de
arquivar.

---

### Tarefa 2: Emitir a proposta

**Arquivos:** `proposals/` (controller, service, DTOs).

**Rotas:**
- `POST /admin/proposals` — recebe as escolhas (ids do catálogo + itens próprios +
  multiplicador + desconto) e os dados do cliente; **recalcula no backend** e grava.
- `GET /admin/proposals` — lista
- `GET /admin/proposals/{id}` — uma
- `POST /admin/proposals/{id}/status` — muda a situação
- `POST /admin/proposals/{id}/archive`

**Regras:**
- O pedido manda **escolhas**, não valores. Quem calcula é o servidor.
- Item do catálogo arquivado **ainda pode** ser usado se estava ativo quando a tela
  carregou? **Não**: recusa com 409 e diz qual item saiu. Melhor recusar do que emitir
  uma proposta com item que não se vende mais.
- Validade padrão: 15 dias. Editável.

**Prova:** o total gravado é o do `QuoteCalculator`, mesmo que o pedido mande outro
número; item arquivado dá 409 nomeando o item; TEAM recebe 403; emitir registra na
trilha.

---

### Tarefa 3: A página da proposta (pública, por link)

**Arquivos:** `proposals/controller/PublicProposalController.java`,
`pages/public/Proposta.tsx`.

**Rotas:** `GET /public/proposals/{token}` na API; `/proposta/:token` na tela.

**Regras:**
- Sem sessão. O token é a credencial: longo, aleatório, impossível de adivinhar.
- Mostra **só aquela proposta**. Nenhum dado de outra, nenhum nome de outro cliente.
- Proposta arquivada ou vencida mostra "esta proposta não está mais disponível" — sem
  dizer se existiu.
- **Limite de tentativas por IP** nesta rota: token aleatório não se adivinha, mas não
  custa fechar a porta.

**Prova:** token errado dá 404 sem dizer nada; proposta de outra organização pelo token
certo funciona (o token é a autorização); arquivada não abre; a resposta não traz
`org_id` nem id interno.

---

### Tarefa 4: Impressão A4

**Arquivos:** `pages/public/Proposta.tsx`, `styles/impressao.css`.

**Regras:**
- Botão "Imprimir / Salvar em PDF" que chama `window.print()`. **Sem biblioteca de
  PDF**: o navegador já faz, e faz melhor do que qualquer coisa que eu escreva.
- CSS de impressão: A4, sem o fundo escuro (tinta preta custa caro e fica ilegível),
  sem menu, sem botões, quebra de página entre as seções.
- Campos de assinatura do cliente e da 77xp, como na sua calculadora.
- Cabeçalho com o número da proposta e a validade.

**Prova:** um teste confere que o CSS de impressão esconde os botões e troca o fundo;
uma foto em modo de impressão entra na documentação.

---

### Tarefa 5: Mandar para o cliente

**Arquivos:** `pages/panel/Propostas.tsx`.

**Regras:**
- Botão **WhatsApp**: abre `wa.me` com o telefone do cliente e uma mensagem pronta
  com o link. Sem integração, sem chave — é só um link, e funciona no celular e no
  computador.
- Botão **Copiar link**.
- **E-mail** entra na fila de e-mail que já existe, com um modelo novo.
- Mandar muda a situação para ENVIADA e registra na trilha.

**Prova:** o link do WhatsApp tem o telefone só com dígitos e a mensagem codificada;
mandar por e-mail enfileira uma mensagem; a situação muda.

---

### Tarefa 6: A lista de propostas (`/painel/propostas`)

**Arquivos:** `pages/panel/Propostas.tsx`.

Lista com número, cliente, valor, situação e validade. Filtro por situação. Abrir leva
à proposta.

**Prova:** as situações aparecem com nome de gente; proposta vencida aparece marcada;
403 vira aviso.

---

## O que este plano NÃO faz

- **Não cobra.** Stripe é o plano 3 desta etapa.
- Não manda lembrete automático de proposta vencendo.
- Não gera contrato.
- Não aceita assinatura eletrônica com validade jurídica — o campo é para assinar à
  mão, depois de imprimir, como a sua calculadora faz hoje.

---

## Uma coisa que eu faria diferente do admin atual

O `/admin` de hoje gera a proposta **calculando na hora da exibição**, a partir do tipo
de projeto do lead. Ou seja: a mesma proposta, aberta em dois dias diferentes, pode
mostrar valores diferentes se o código mudar no meio.

Aqui a proposta é um documento, não uma consulta. Uma vez emitida, ela é o que é.
