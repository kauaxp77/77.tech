# Frontend do 77xp OS

As telas do sistema: entrar, criar senha, painel, contas de acesso e área do cliente.
Feito em React 19 + Vite 7 + Tailwind 4, conversando com a API Java que está em
`os/backend`.

Este projeto **não é** o site 77xp.tech. O site é o Next.js na raiz do repositório e
continua sendo ele quem responde pelo domínio. Este aqui vai para um subdomínio
(`app.77xp.tech` ou parecido).

## Como rodar

Tudo em containers, do jeito combinado — nada de instalar Node, Java ou Postgres
direto no Windows:

```bash
# Na raiz do repositório
docker compose -f os/docker-compose.yml up -d
```

Sobem juntos o banco, o servidor de e-mail de mentira (Mailpit), a API e as telas:

| O quê | Endereço |
|---|---|
| Telas | http://localhost:5173 |
| API | http://localhost:8080/api/v1 |
| Caixa de e-mail (Mailpit) | http://localhost:8025 |

### A primeira vez: criar o dono

A organização nasce sem ninguém. Passe o e-mail do dono na subida da API:

```bash
BOOTSTRAP_OWNER_EMAIL=dono@77xp.local docker compose -f os/docker-compose.yml up -d
```

A API manda um e-mail de primeiro acesso. Abra o Mailpit em http://localhost:8025,
clique no link e escolha a senha. Ninguém — nem esta documentação, nem o código —
escolhe senha por você.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe as telas em modo de desenvolvimento |
| `npm run lint` | ESLint (config própria em `eslint.config.mjs`) |
| `npm run typecheck` | `tsc --noEmit`, checando de verdade |
| `npm test` | Vitest — telas e cliente HTTP, com a API simulada |
| `npm run build` | Gera a pasta `dist/`, com a porta de entrada pré-gerada |
| `npm run e2e` | Playwright contra a pilha inteira de pé |

O CI (`.github/workflows/os-frontend.yml`) roda os quatro primeiros. O `e2e` não:
ele precisa do banco, da API e do e-mail de pé, então roda no computador.

### Rodando o e2e

Com a pilha de pé e o dono criado (o mesmo e-mail que você passou em
`BOOTSTRAP_OWNER_EMAIL`):

```bash
cd os/frontend
E2E_OWNER_EMAIL=dono@77xp.local npm run e2e
```

Na primeira vez, se o dono ainda não tiver senha, o próprio e2e pede "esqueci minha
senha", lê o link no Mailpit e cria uma senha de teste. Ele não escreve no banco:
usa os mesmos caminhos que uma pessoa usaria.

Ele apaga a caixa de e-mail, entra como dono, convida um cliente, lê o convite no
Mailpit, cria a senha do cliente e confere que ele entra na área dele e **não** entra
no painel. No tamanho de celular, confere que o menu abre e fecha e que nenhuma tela
passa da largura da tela.

Os e-mails de convite usam um endereço diferente a cada rodada (`cliente-<hora>@…`),
então dá para rodar quantas vezes quiser sem dar conflito.

## Como o código está organizado

```
src/
  api/        Cliente HTTP, tipos e chamadas à API (+ hooks do TanStack Query)
  app/        Sessão (AuthProvider), guardas de rota e QueryProvider
  layout/     A estrutura do painel e da área do cliente (menu lateral / ☰)
  pages/
    auth/     Entrar, criar senha, esqueci a senha
    panel/    Visão geral e contas de acesso
    portal/   Área do cliente
    account/  Minha conta (a mesma tela serve o painel e a área do cliente)
    public/   A porta de entrada pública, pré-gerada no build
  ui/         Botão, campo, cartão, logo, fundo
  styles/     Cores, sombras e utilidades do Tailwind
e2e/          Playwright: os caminhos de ponta a ponta
```

## Duas coisas que não são óbvias

**O token de acesso fica só na memória.** Nunca no `localStorage`, onde qualquer
script da página o leria. O token de renovação vive num cookie `HttpOnly`, que o
JavaScript não alcança. Quando a sessão cai no meio do uso, o cliente HTTP renova
**uma vez por aba**, com uma trava entre abas — se duas abas gastarem o mesmo token
de renovação, o backend entende como token copiado e derruba todas as sessões.

**Esconder botão não é segurança.** A tela some com o que a conta não pode fazer
(bloquear o dono, convidar administrador sendo administrador, o menu de contas para
quem é da equipe) só para não oferecer um caminho que termina em erro. Quem recusa de
verdade é a API.
