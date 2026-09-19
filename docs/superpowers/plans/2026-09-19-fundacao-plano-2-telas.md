# Fundação — Plano 2: Telas — Plano de implementação

**Objetivo:** entregar as telas da Fundação do 77xp OS — página inicial pública pré-gerada
com o botão "Entrar", painel (visão geral, conta, contas de acesso) e Área do cliente —
conversando com a API do plano 1, tudo rodando e testado em containers.

**Spec:** `docs/superpowers/specs/2026-09-18-fundacao-design.md` (seção "Frontend"). Ela é
a autoridade; onde este plano e a spec discordarem, vale a spec.

**Plano 1 (backend):** pronto, 236 testes. As rotas que este plano consome já existem e
estão descritas em `os/backend/README.md` e na documentação da API (`/swagger-ui.html`
no ambiente local).

**Stack:** React 19 · Vite 7 · React Router 7 · TypeScript · Tailwind 4 · TanStack Query 5
· Vitest + Testing Library · Playwright. Node 24 no container.

> **Sobre o formato:** o plano 1 trazia todo o código dentro do documento. Este não. Cada
> tarefa diz **quais arquivos**, **quais regras**, **o que o teste precisa provar** e **o
> resultado esperado**; o código é escrito na execução, com o teste falhando primeiro.
> Copiar código para dentro do plano e depois para o repositório dobra o trabalho sem
> deixar o resultado melhor — e foi no código colado do plano 1 que apareceram os três
> erros de compilação que tive de corrigir.

## Restrições globais

- Tudo mora em `os/frontend/`. O site Next.js da raiz (`src/`, `package.json`,
  `tsconfig.json`, `vercel.json`, `docker-compose.yml` da raiz) **não é tocado**, com uma
  exceção prevista na Tarefa 1: excluir `os/` do `tsconfig`, do ESLint e dos testes dele,
  para as duas aplicações não se atrapalharem.
- Tudo roda em containers: `docker compose -f os/docker-compose.yml`, a partir da raiz.
  Nada de instalar Node no Windows.
- Marca, igual à do site atual: roxo `#7C4DFF`, fundo `#050505`, fonte Poppins.
- Identificadores em inglês; comentários e textos de tela em **português**.
- TDD: todo comportamento começa por um teste que falha pelo motivo certo. A tarefa só
  fecha com `npm run typecheck`, `npm test` e `npm run build` passando.
- A API é a única fonte de verdade sobre permissões. A tela esconde o que a pessoa não
  pode fazer por conforto, nunca por segurança: quem tentar na mão recebe 403 da API.
- Nenhum segredo no frontend. O access token vive **em memória**; o refresh token é o
  cookie `xp_refresh`, que o JavaScript não lê.
- Cada tarefa termina num commit convencional em inglês, com as linhas de atribuição.

## Mapa de arquivos

```
os/frontend/
  package.json  vite.config.ts  tsconfig.json  tailwind.config.ts  index.html
  playwright.config.ts  .env.example  README.md
  src/
    main.tsx  App.tsx  router.tsx
    app/          QueryProvider, AuthProvider, RequireAuth, RequireRole
    api/          http.ts (cliente com renovação e trava entre abas), ApiError, tipos
    api/hooks/    useMe, useLogin, useLogout, useMembers, useInvite…
    ui/           Button, Input, Field, Card, Badge, Spinner, EmptyState, Toast
    layout/       PanelLayout (menu lateral + ☰ no celular), PublicHeader, PublicFooter
    pages/public/ Home
    pages/auth/   Entrar, PrimeiroAcesso, RedefinirSenha, EsqueciSenha
    pages/panel/  VisaoGeral, Conta, ContasDeAcesso
    pages/portal/ MinhaConta
    styles/       tokens.css
  e2e/            desktop.spec.ts  celular.spec.ts
.github/workflows/os-frontend.yml
os/docker-compose.yml          (serviço frontend)
```

## Ordem das tarefas

1. Esqueleto + containers + separação do site atual
2. Marca, componentes de base e o esqueleto do painel (responsivo)
3. Cliente HTTP (renovação uma vez por aba, trava entre abas, `ApiError`)
4. Sessão, guardas de rota e TanStack Query
5. `/entrar`
6. `/primeiro-acesso`, `/redefinir-senha` e `/esqueci-a-senha`
7. `/painel` (visão geral) e `/painel/conta`
8. `/painel/contas` — Contas de acesso
9. `/minha-conta` — Área do cliente
10. `/` — página inicial pública pré-gerada
11. Ponta a ponta (computador e celular), CI e verificação final

---

### Tarefa 1: Esqueleto, containers e separação do site atual

**Arquivos:** `os/frontend/` (package.json, vite.config.ts, tsconfig.json, index.html,
`src/main.tsx`, `src/App.tsx`, vitest setup); `os/docker-compose.yml` (serviço `frontend`);
raiz: `tsconfig.json`, `eslint.config.mjs`, `playwright.config.ts` (excluir `os/`).

**Regras:**
- Scripts: `dev`, `build`, `preview`, `test`, `typecheck`, `lint`, `e2e`.
- `typecheck` é `tsc --noEmit` **checando de verdade**: nada de `"files": []` (lição 6 do
  Beto_Banco, onde a checagem não verificava nada).
- O serviço `frontend` do compose sobe o Vite em Node 24 na porta 5173, com
  `VITE_API_URL` apontando para a api dentro da rede dos containers.
- O site Next.js da raiz passa a ignorar `os/`: sem isso o `tsc` e o ESLint dele tentam
  compilar o frontend novo e quebram.

**Prova:** `npm run typecheck` acusa um erro de tipo proposital e depois passa;
`npm test` roda um teste de fumaça; `npm run build` gera `dist/`; `npm run lint` do site
da raiz continua passando.

### Tarefa 2: Marca, componentes de base e esqueleto do painel

**Arquivos:** `src/styles/tokens.css`, `tailwind.config.ts`, `src/ui/*`,
`src/layout/PanelLayout.tsx`.

**Regras:**
- Tokens iguais aos do site: `--color-primary: #7C4DFF`, `--color-background: #050505`,
  Poppins.
- `PanelLayout`: no computador, menu lateral fixo; no celular, barra de topo com ☰ e o
  menu por cima da página, fechando ao escolher um item e ao apertar Esc.
- O menu recebe os itens de fora: mostra só as seções que existem.
- Componentes com foco visível e rótulos ligados aos campos (`<label for>`), porque as
  telas de senha precisam funcionar no teclado e no leitor de tela.

**Prova (Vitest + Testing Library):** no celular o menu começa fechado, abre no ☰, fecha ao
escolher um item e ao apertar Esc; no computador o menu está sempre visível; o item da
página atual é marcado como atual (`aria-current`).

### Tarefa 3: Cliente HTTP

**Arquivos:** `src/api/http.ts`, `src/api/ApiError.ts`.

**Regras (portadas do Beto_Banco, com as correções da spec):**
- O access token fica **em memória**, nunca em `localStorage`.
- Toda resposta de erro vira `ApiError(code, status, message, fieldErrors)`, lendo o
  envelope da API (`{success, error: {code, message, status, fieldErrors}}`).
- Em 401, tenta renovar **uma vez** e repete a chamada; se a renovação falhar, limpa a
  sessão e manda para `/entrar`.
- **Trava entre abas** (`localStorage`, 10 s): duas abas não podem renovar ao mesmo tempo,
  senão as duas gastam o mesmo refresh token e o backend entende como token roubado e
  derruba todas as sessões (o backend faz isso de propósito — Tarefa 8 do plano 1).
- Requisições simultâneas que tomam 401 esperam **a mesma** renovação, não uma cada.

**Prova:** 401 renova uma vez e repete; duas chamadas simultâneas com 401 geram **uma**
renovação; com a trava de outra aba levantada, a aba espera em vez de renovar; renovação
que falha limpa a sessão; erro da API vira `ApiError` com os campos certos; a trava vence
depois de 10 s (aba que travou e morreu não trava o sistema para sempre).

### Tarefa 4: Sessão, guardas de rota e TanStack Query

**Arquivos:** `src/app/AuthProvider.tsx`, `RequireAuth.tsx`, `RequireRole.tsx`,
`QueryProvider.tsx`, `src/router.tsx`.

**Regras:**
- Ao abrir o site, tenta renovar uma vez: quem tem cookie válido já entra logado.
- Enquanto não sabe, mostra carregando — nunca joga para `/entrar` antes de saber.
- `RequireRole` manda `CLIENT` para `/minha-conta` e os outros para `/painel`.
- Depois do login, volta para a página que a pessoa tentou abrir.

**Prova:** sem sessão, `/painel` leva a `/entrar`; com sessão de `CLIENT`, `/painel` leva a
`/minha-conta`; com sessão de `TEAM`, `/minha-conta` leva a `/painel`; a rota tentada é
lembrada; durante a verificação inicial não pisca a tela de login.

### Tarefa 5: `/entrar`

**Arquivos:** `src/pages/auth/Entrar.tsx`, `src/api/hooks/useLogin.ts`.

**Regras:** e-mail e senha; erro da API aparece como está ("E-mail ou senha inválidos.");
429 vira "Muitas tentativas. Tente de novo em um minuto."; botão desabilitado enquanto
envia; link para "Esqueci minha senha"; quem já tem sessão válida não vê esta tela.

**Prova:** login certo leva ao lugar certo conforme o tipo de conta; login errado mostra a
mensagem da API e **não** vaza se o e-mail existe; 429 mostra a mensagem de espera; o
formulário não envia duas vezes.

### Tarefa 6: `/primeiro-acesso`, `/redefinir-senha` e `/esqueci-a-senha`

**Arquivos:** `src/pages/auth/PrimeiroAcesso.tsx`, `RedefinirSenha.tsx`, `EsqueciSenha.tsx`.

**Regras:**
- As duas primeiras leem o `token` da URL; sem token, mostram "Link inválido ou expirado".
- Senha e confirmação; mínimo de 8 caracteres conferido na tela **e** na API.
- Link vencido ou já usado mostra a mensagem da API e oferece pedir outro.
- `/esqueci-a-senha` **sempre** diz "Se este e-mail tiver conta, enviamos o link" — a API
  responde igual exista ou não, e a tela não pode estragar isso.
- Depois de criar a senha, leva para `/entrar` com um aviso de sucesso.

**Prova:** sem token, recusa; senha curta é barrada antes de chamar a API; senhas
diferentes são barradas; link inválido mostra a mensagem certa; sucesso leva a `/entrar`;
`/esqueci-a-senha` mostra a mesma resposta para e-mail que existe e que não existe.

### Tarefa 7: `/painel` e `/painel/conta`

**Arquivos:** `src/pages/panel/VisaoGeral.tsx`, `Conta.tsx`, `src/api/hooks/useMe.ts`.

**Regras:** Visão geral é um estado vazio honesto ("Seu painel está sendo montado") com o
nome de quem entrou — os números chegam na etapa 6. `/painel/conta` troca a senha (senha
atual + nova) e sai. Trocar a senha derruba todas as sessões: a tela avisa antes e manda
para `/entrar` depois.

**Prova:** a visão geral mostra o nome e o estado vazio; senha atual errada mostra "Senha
atual incorreta."; troca certa leva a `/entrar`; "Sair" limpa a sessão e volta ao site.

### Tarefa 8: `/painel/contas` — Contas de acesso

**Arquivos:** `src/pages/panel/ContasDeAcesso.tsx`, `src/api/hooks/useMembers.ts` e
`useInvite.ts`.

**Regras (D10):**
- Lista com e-mail, nome, tipo, situação (`PENDING` = "Aguardando primeiro acesso",
  `ACTIVE` = "Ativa", `BLOCKED` = "Bloqueada") e último acesso.
- Convidar: e-mail, nome e tipo. O `OWNER` pode convidar `ADMIN`, `TEAM` e `CLIENT`; o
  `ADMIN`, só `TEAM` e `CLIENT`. `OWNER` nunca aparece na lista de tipos.
- Reenviar convite, bloquear e desbloquear, com confirmação nas duas últimas.
- 409 mostra "Este e-mail já tem acesso nesta organização." no campo do e-mail.
- Ninguém vê botão de bloquear na própria conta nem na do dono.

**Prova:** a lista mostra as três situações; o seletor de tipo muda conforme quem está
logado; 409 aparece no campo certo; bloquear pede confirmação e atualiza a linha; a
própria conta e a do dono não têm botão de bloquear; erro 403 da API vira aviso na tela.

### Tarefa 9: `/minha-conta` — Área do cliente

**Arquivos:** `src/pages/portal/MinhaConta.tsx`.

**Regras:** mesmo visual e mesma estrutura responsiva do painel, com menu próprio (Início e
Minha conta). Início mostra as boas-vindas com o nome e o nome da organização
(`GET /portal/me`). Minha conta troca a senha e sai. Nada do painel de administração
aparece aqui.

**Prova:** o cliente vê o próprio nome e o da organização; o menu não tem nenhum item do
painel; trocar a senha funciona igual ao painel.

### Tarefa 10: `/` — página inicial pública

**Arquivos:** `src/pages/public/Home.tsx`, `src/layout/PublicHeader.tsx`,
`PublicFooter.tsx`, pré-geração no `vite.config.ts`.

**Regras:**
- Conteúdo portado do site atual: Hero, Soluções, Diferenciais, Metodologia, CTA.
- **Pré-gerada no build**: o texto precisa estar no HTML do arquivo, não só depois que o
  JavaScript roda — é disso que o Google precisa. Título e descrição na página.
- Botão "Entrar" no cabeçalho, sempre com esse texto, levando a `/entrar`.

**Prova:** um teste abre o `dist/index.html` **como arquivo** e encontra os títulos das
seções e a descrição; o botão "Entrar" está no HTML; a página não estoura a largura no
celular.

### Tarefa 11: Ponta a ponta, CI e verificação final

**Arquivos:** `e2e/desktop.spec.ts`, `e2e/celular.spec.ts`, `playwright.config.ts`,
`.github/workflows/os-frontend.yml`, `os/frontend/README.md`, `.env.example`.

**Regras e prova (Playwright, contra a pilha inteira em containers):**
- Computador: dono entra → painel → contas de acesso → convida um cliente → o convite
  aparece no Mailpit → o cliente abre o link, cria a senha e entra na **Área do cliente**;
  o cliente tenta `/painel` e é mandado embora.
- Celular (viewport de telefone): o menu abre e fecha pelo ☰ e **nada sai da tela**
  (nenhum scroll horizontal em nenhuma das telas).
- Sair funciona e a sessão não volta ao apertar "voltar" no navegador.
- CI do frontend: `npm ci`, `typecheck`, `test`, `build`.
- Verificação final: `git status` limpo e nada alterado fora de `os/`, `docs/` e dos dois
  workflows.

---

## O que este plano NÃO faz

- Números e gráficos no painel (etapa 6), catálogo e preços (etapa 2), clientes e
  assinaturas (etapa 3), CRM (etapa 4), portfólio, calculadora, blog e contato.
- Publicação: Render, Supabase novo, projeto separado na Vercel, rewrites e a troca do
  site. Isso é o plano 3, e a troca do site só acontece no fim da etapa 4.
- Dados de demonstração para o e2e: nascem na Tarefa 11, num script que **nunca** vai para
  produção.
