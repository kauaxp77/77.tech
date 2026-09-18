# Fundação do 77xp OS — Design

> Etapa 1 de 7 do [plano geral](../../plano/2026-09-18-plano-geral.md). Aprovado em
> conversa em 18/09/2026 (partes 1, 2 e 3). Este documento guia o plano de implementação.

## Resumo em português simples

A Fundação é o esqueleto do sistema novo. Ao final dela existe:

- o **painel novo** com login seguro, menu de seções (ainda vazio), troca de senha e saída;
- o botão **"Entrar"** no site e **contas por convite** para a equipe e para os clientes:
  cada pessoa tem o próprio login; a equipe vai para o painel e o cliente vai para a
  **Área do cliente** (por enquanto: boas-vindas, trocar senha e sair);
- a **página inicial pública nova**, gerada pronta para o Google;
- **organizações** desde o primeiro dia (base do white-label), com o banco entregando só
  os dados da organização de quem está logado;
- **histórico de auditoria** de tudo que muda no painel;
- **fila de e-mail** (redefinição de senha e primeiro acesso);
- **testes automáticos**, ambiente em **containers** no computador, e publicação em
  **teste** e **oficial**.

Nenhum módulo de negócio (leads, preços, clientes) entra aqui: eles vêm nas etapas
seguintes, em cima desta base.

## Decisões

| # | Decisão | Motivo | Alternativa descartada |
|---|---|---|---|
| D1 | Dentro do repositório **77.tech**, na pasta `os/` (`os/backend/`, `os/frontend/`, `os/docker-compose.yml`); documentos em `docs/` | Pedido do dono em 18/09/2026: todas as mudanças no repositório 77.tech. O site atual (Next.js, na raiz) segue intacto até a troca | Repositório separado `77xp-os` (criado e deixado sem uso) |
| D2 | Backend Java 21 + Spring Boot 3.5 (Web, Security, Data JPA, Validation, Actuator, Mail) + Flyway; PostgreSQL 17 | Stack do Beto_Banco, já em produção | — |
| D3 | Frontend React 19 + TypeScript + Vite + React Router 7 em **modo framework com `prerender`** para as rotas públicas; painel como SPA; TanStack Query v5 | Páginas públicas precisam aparecer no Google | SPA pura como no Beto_Banco |
| D4 | **Tailwind CSS 4** com os tokens visuais do 77.tech (roxo `#7C4DFF`, fonte Poppins, fundo `#050505`) | Todo o visual atual já é Tailwind: painel e landing são reaproveitados | CSS próprio com tokens (Beto_Banco) |
| D5 | Abordagem A: projeto novo, **portando** módulos testados do Beto_Banco (`shared`, `security`, `auth`, `users`, `audit`, `email`) com os testes deles, e corrigindo os problemas conhecidos | Mais rápido e mais seguro | Copiar tudo e apagar; reescrever do zero |
| D6 | Supabase novo usado só como PostgreSQL (sem Supabase Auth, sem RLS via JWT do Supabase) | O login passa a ser do próprio sistema, como no Beto_Banco | Reusar o Supabase do 77.tech |
| D7 | White-label preparado: `org_id` + RLS **ativo** desde o dia 1 | Retrofit depois custaria reescrever tabelas e regras | Adicionar organizações só na etapa 7 |
| D8 | Ambientes: local (containers), **teste** (branch `teste`) e **oficial** (branch `main`) | Fluxo "testa antes" pedido pelo dono | Só local + oficial |
| D9 | E-mail pela fila (outbox) com envio SMTP; provedor **Resend** (SMTP) em teste/oficial e **Mailpit** no local | Mesmo código do Beto_Banco; Resend já é usado pelo 77.tech | API HTTP específica de um provedor |
| D10 | Contas **só por convite**, com os tipos Dono, Administrador, Equipe e Cliente; o cliente usa a **Área do cliente** e nunca o painel de administração | Aprovado em 18/09/2026: evita contas falsas e deixa o dono administrar os clientes pelas contas deles | Cadastro aberto no site; Área do cliente só depois da etapa 3; Área do cliente no site atual |

## Arquitetura

```
Navegador ──► Vercel (frontend: páginas públicas prontas + painel)
                 │  /api/*  (rewrite: mesmo site → cookie de sessão funciona)
                 ▼
             Render (backend Spring Boot, /api/v1) ──► Supabase (PostgreSQL 17)
                 │
                 └─► Resend (SMTP) — e-mails da fila
```

- O navegador fala só com a Vercel. As chamadas `/api/*` são repassadas pela Vercel ao
  Render (rewrite), então tela e API ficam no **mesmo site** e o cookie de sessão
  (`SameSite=Lax`) funciona — como no Beto_Banco.
- Ambiente de teste: o rewrite escolhe o destino pelo endereço (`has: host`): o endereço
  fixo do branch `teste` na Vercel vai para a API de teste; o resto vai para a oficial.
  **Verificar na implementação** o nome exato do endereço fixo do branch na Vercel.

## Backend

### Pacotes e módulos

Pacote raiz `com.xp77.os`. Cada módulo segue a convenção do Beto_Banco:

| Subpacote | Conteúdo |
|---|---|
| `api/` | Interfaces e records públicos — **única** porta que outros módulos podem usar |
| `controller/` | Controllers públicos e `Admin*Controller` sob `/admin/**` |
| `dto/` | Records de entrada/saída com Bean Validation |
| `entity/` | Entidades JPA com métodos de domínio |
| `repository/` | Spring Data |
| `service/` | Implementa as interfaces de `api/` |

Módulos da Fundação: `shared`, `config`, `security`, `auth`, `users`, `organizations`,
`audit`, `email`.

**ArchUnit** (regras portadas e corrigidas):
1. Nenhuma classe fora de `<modulo>` usa `<modulo>.entity..` ou `<modulo>.repository..`.
   A lista de módulos é **descoberta automaticamente** a partir dos pacotes de primeiro
   nível (no Beto_Banco a lista é fixa e ficou desatualizada).
2. Nenhum `@RestController` recebe `userId`/`orgId` por parâmetro ou corpo: identidade e
   organização vêm só de `@AuthenticationPrincipal`.
3. Nenhum controller devolve `@Entity`.

### Convenções da API

- Prefixo `/api/v1`; envelope `ApiResponse<T>(success, data, error)` e
  `PageResponse<T>` (portados); `ErrorPayload(code, message, status, path, traceId,
  timestamp, fieldErrors)`; `GlobalExceptionHandler` com mensagens genéricas.
- `TraceIdFilter` (header `X-Trace-Id`), paginação padrão 20 / máximo 100.
- OpenAPI (springdoc) **só em local e teste** (no Beto_Banco o Swagger ficou público em produção).
- Actuator: só `health` e `info`; health em `/api/v1/actuator/health` (usado pelo Render).

### Banco de dados e migrações (Flyway)

Convenções portadas: UUID (`gen_random_uuid()`), `TIMESTAMPTZ`, dinheiro em `BIGINT *_cents`,
estados como `TEXT` + `CHECK`, restrições nomeadas `<tabela>_<regra>_check`, regras de
negócio no banco sempre que possível. Hibernate só valida (`ddl-auto: validate`).

| Migração | Conteúdo |
|---|---|
| V1 | Extensões (`pgcrypto`, `citext` se preciso) e `search_path` compatível com o schema `extensions` do Supabase |
| V2 | `organizations` (id, nome, slug, domínio, tema `jsonb`, ativa) + organização raiz **77xp** com id fixo |
| V3 | `users` (identidade global: e-mail minúsculo único, nome, hash da senha — vazio até o primeiro acesso —, status `ACTIVE`/`BLOCKED`) e `memberships` (user × org × papel `OWNER`/`ADMIN`/`TEAM`/`CLIENT`, situação `ACTIVE`/`BLOCKED`, último acesso, única por par) |
| V4 | Papel de banco da aplicação (`app_77xp`), permissões padrão e RLS por organização em `memberships` (abaixo) — antes das outras tabelas, para cada tabela nova já nascer protegida |
| V5 | `refresh_tokens` (hash SHA-256, família, `replaced_by`, revogação, aparelho, IP) e `password_reset_tokens` (finalidade `FIRST_ACCESS`/`RESET`, validade) — ligadas ao usuário, sem RLS de organização |
| V6 | `audit_logs` (org, ator, ação, entidade, IP, user agent, resultado, metadados `jsonb`) com RLS por organização e **só inserção** |
| V7 | `email_outbox` (org, destinatário, template, dados `jsonb`, `PENDING`/`SENT`/`FAILED`, tentativas, próxima tentativa, `dedup_key` única) — fila do sistema, processada em segundo plano, sem RLS de organização |

### Organizações e RLS (a metade que falta no Beto_Banco)

No Beto_Banco as políticas existem, mas nada informa ao banco a organização da
requisição, então o RLS não isola nada. Aqui:

1. Toda tabela que pertence a uma organização tem `org_id uuid NOT NULL`, índice, e
   `ENABLE` + `FORCE ROW LEVEL SECURITY` com a política
   `org_id = current_setting('app.org_id', true)::uuid` (em `USING` e `WITH CHECK`).
   **Sem** a exceção "ou `app.org_id` vazio" que o Beto_Banco usa: sem organização, nada aparece.
2. Tabelas globais (`users`, `organizations`) não têm RLS de organização; o acesso a elas
   passa só pelos serviços dos módulos donos.
3. A aplicação conecta com um **papel de banco próprio** (`app_77xp`), sem `BYPASSRLS` e
   sem ser dono das tabelas; o Flyway roda com o papel dono. **Verificar na
   implementação** os atributos do papel `postgres` do Supabase e ajustar.
4. Um `JpaTransactionManager` próprio executa `select set_config('app.org_id', ?, true)`
   no início de **cada transação**, com a organização do usuário autenticado
   (claim `org` do token, conferida contra `memberships`). Rotas públicas resolvem a
   organização pelo domínio da requisição (padrão: 77xp).
5. Teste com Testcontainers: duas organizações, dados nas duas, e a prova de que A não lê,
   não altera e não apaga nada de B — nem com consulta direta no repositório.

### Login e sessões (portado do Beto_Banco)

- Senha: `DelegatingPasswordEncoder` com `{argon2}` (Argon2id).
- Token de acesso: JWT HS256 de 15 min (`sub`, `jti`, `org`, `roles`, `email`); a
  aplicação não sobe se `JWT_SECRET` tiver menos de 32 bytes.
- Refresh token: 32 bytes aleatórios, só o hash SHA-256 fica no banco, validade de 30 dias,
  **rotação** a cada uso (`replaced_by`) e **detecção de reuso**: se um token já trocado
  for apresentado, todas as sessões do usuário são revogadas e a resposta é 401.
- Cookie `xp_refresh`: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`.
- Limite de sessões ativas por usuário (`MAX_ACTIVE_SESSIONS`, padrão 3): um aparelho novo
  derruba a sessão mais antiga.
- Limite de tentativas (Bucket4j) em login, esqueci-a-senha e redefinição, pelo **IP real
  do cliente** — não pelo primeiro valor do `X-Forwarded-For`, que pode ser falsificado
  chamando o Render direto. **Verificar na implementação** qual cabeçalho/posição o
  Render garante.
- Primeiro acesso: um comando de inicialização cria o dono da organização 77xp
  (`BOOTSTRAP_OWNER_EMAIL`) e envia o e-mail de primeiro acesso (token de 72 h). Troca de
  senha revoga todas as sessões.
- Papéis ficam **só no servidor** (`memberships.role`). Nada de permissão em campo que o
  usuário edita.

### Contas de acesso (convites) e Área do cliente

Aprovado em 18/09/2026 (D10). Cada pessoa tem o próprio login; ninguém cria conta sozinho.

- **Tipos de conta** (`memberships.role`): `OWNER` (dono; um por organização, criado só
  pelo comando de inicialização), `ADMIN`, `TEAM` e `CLIENT`. `/admin/**` aceita só
  `OWNER`/`ADMIN` (as seções da equipe chegam com os módulos); `/portal/**` aceita só
  `CLIENT`. Um cliente recebe 403 em `/admin/**` e a equipe recebe 403 em `/portal/**`.
- **Convite** — `POST /admin/users/invitations` (`email`, `name`, `role`): cria a pessoa se
  o e-mail ainda não existe (sem senha), cria o vínculo com a organização e enfileira o
  e-mail de convite com um token `FIRST_ACCESS` de 72 h (o texto muda para cliente e para
  equipe). Se a pessoa já tem senha (conta de outra organização), o e-mail só avisa para
  entrar com a senha dela. Regras: ninguém convida `OWNER`; só o `OWNER` convida ou altera
  um `ADMIN`; o `ADMIN` convida `TEAM` e `CLIENT`; e-mail que já tem vínculo na organização
  → 409.
- **Gestão** — `GET /admin/users` (nome, e-mail, tipo, situação — aguardando primeiro
  acesso, ativa ou bloqueada — e último acesso), `POST /admin/users/{id}/invitation`
  (reenvia o convite e invalida o link anterior), `POST /admin/users/{id}/block` e
  `POST /admin/users/{id}/unblock`. O bloqueio vale **para a organização** (situação do
  vínculo, pensando no white-label), não para a pessoa no sistema todo; bloquear revoga na
  hora todas as sessões da pessoa, e o login numa organização exige pessoa e vínculo
  ativos. Ninguém bloqueia a si mesmo nem o `OWNER`. Tudo passa pela auditoria de `/admin/**`.
- **Último acesso** fica no vínculo (`memberships.last_login_at`) e é atualizado a cada login.
- **Área do cliente (API)**: `GET /portal/me` devolve nome, e-mail e organização para a tela
  de boas-vindas. O conteúdo (proposta, reuniões, pagamentos, projeto, contrato, sistemas e
  chamados) chega com cada módulo.

### Auditoria

`AuditLogger` (API do módulo `audit`) com constantes de ação; um interceptor grava toda
chamada `POST`/`PUT`/`PATCH`/`DELETE` em `/admin/**` com o corpo (até 64 KB) e as chaves
sensíveis mascaradas; login, logout, falha de login e reuso de sessão também são
registrados. A tabela só aceita inserção (sem permissão de `UPDATE`/`DELETE` para o
papel da aplicação).

### Fila de e-mail

`EmailService.enfileirar(para, template, dados, chaveDeDeduplicacao)`; `EmailDispatcher`
a cada 15 s pega até 20 mensagens com `SKIP LOCKED` **dentro da mesma transação do envio**,
backoff 1 min, 5 min, 30 min, 2 h, 12 h e depois `FAILED`. O indicador de saúde de e-mail
fica desligado (SMTP fora do ar não derruba a aplicação). Templates da Fundação: primeiro
acesso e redefinição de senha.

### Configuração

Perfis `dev`, `test` e `prod`. `prod` exige as variáveis sem valor padrão e falha rápido
se faltar alguma. Variáveis (nomes finais, documentados em `.env.example` **exatamente**
como o código lê):

`DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `FLYWAY_USER`, `FLYWAY_PASSWORD`,
`JWT_SECRET`, `MAX_ACTIVE_SESSIONS`, `CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`,
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`,
`BOOTSTRAP_OWNER_EMAIL`, `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`.

## Frontend

- **Rotas públicas** (pré-geradas no build): `/` — página inicial portada do 77.tech
  (Hero, Soluções, Diferenciais, Metodologia, CTA, cabeçalho e rodapé), com título e
  descrição para o Google. As demais páginas públicas (calculadora, blog, contato,
  portfólio) chegam nas etapas seguintes.
- **Rotas do painel** (no navegador): `/entrar`, `/primeiro-acesso`, `/redefinir-senha`,
  `/painel` (Visão geral: estado vazio), `/painel/conta` (trocar senha, sair) e
  `/painel/contas` (**Contas de acesso**: lista, convidar com e-mail/nome/tipo, reenviar
  convite, bloquear e desbloquear; só `OWNER`/`ADMIN`).
- **Botão "Entrar"** no cabeçalho do site público, levando a `/entrar`. O botão é sempre
  "Entrar" (as páginas públicas são pré-geradas); se a sessão ainda vale, `/entrar` leva
  direto ao lugar certo. Depois do login: `OWNER`/`ADMIN`/`TEAM` → `/painel`;
  `CLIENT` → `/minha-conta`.
- **Área do cliente** (`/minha-conta`, só `CLIENT`): mesmo visual e mesma estrutura
  responsiva do painel, com menu próprio (Início e Minha conta); Início mostra as
  boas-vindas com o nome da pessoa; Minha conta troca a senha e sai. `/primeiro-acesso`
  serve para os convites e para o dono.
- **Estrutura do painel** portada da versão responsiva feita no 77.tech: menu lateral fixo
  no computador; no celular, barra de topo com botão ☰ e menu por cima da página; o menu
  mostra só as seções que já existem.
- **Cliente HTTP** portado do Beto_Banco: token de acesso só em memória; em 401 renova a
  sessão **uma vez por aba**, com trava entre abas (`localStorage`, 10 s) para duas abas
  não gastarem o mesmo refresh token (o que dispararia a detecção de reuso); erros viram
  `ApiError(code, status, message, fieldErrors)`.
- `RequireAuth` e `RequireRole`; TanStack Query para dados do servidor.
- Scripts: `npm run dev`, `npm run build`, `npm test` (Vitest) e `npm run typecheck`
  (`tsc --noEmit` checando de verdade — no Beto_Banco o `tsconfig` com `"files": []`
  fazia a checagem não verificar nada).

## Qualidade

| Nível | Ferramenta | O que prova |
|---|---|---|
| Serviços e banco | JUnit + Testcontainers (Postgres 17) | Login, rotação e reuso de sessão, isolamento por organização, fila de e-mail, auditoria |
| API | MockMvc (contexto completo) | Rotas, envelope, erros, permissões |
| Arquitetura | ArchUnit | Fronteiras entre módulos |
| Telas | Vitest + Testing Library | Cliente HTTP (renovação, trava entre abas), guardas de rota, menu |
| Ponta a ponta | Playwright (computador e celular) em container | Entrar, navegar, sair; convite → e-mail no Mailpit → cliente cria a senha → Área do cliente; página pública pré-gerada com o conteúdo no HTML; nada saindo da tela no celular |

Testes obrigatórios das contas: cliente recebe 403 em `/admin/**` e a equipe em
`/portal/**`; as regras de quem convida quem; convite repetido → 409; reenviar invalida o
link anterior; bloquear revoga as sessões e impede o login naquela organização.

- Desenvolvimento orientado a testes: cada comportamento novo começa por um teste que falha.
- GitHub Actions: backend `./mvnw -B verify`; frontend `npm ci`, `typecheck`, `test`,
  `build`. Branch `main` só recebe o que passou.
- Checagem do código de saída do Maven sem `| grep` (lição do Beto_Banco).

## Ambiente local (containers)

`docker compose -f os/docker-compose.yml up` (a partir da raiz do 77.tech; projeto de
containers `xp77-os`, separado do `docker-compose.yml` do site atual) sobe:
`postgres:17-alpine` (porta 5432), Mailpit (1025 SMTP, 8025
caixa de e-mail), a API (imagem Maven/Temurin 21, perfil `dev`) e o frontend (Node 24,
Vite). Dados de demonstração num script separado que **nunca** vai para produção.

## Publicação

| Ambiente | Frontend | Backend | Banco | Branch |
|---|---|---|---|---|
| Local | Vite (container) | Spring (container) | Postgres (container) | qualquer |
| Teste | Vercel (endereço fixo do branch) | Render Starter `77xp-os-api-teste` | Supabase `77xp-os-teste` | `teste` |
| Oficial | Vercel (produção) | Render Starter `77xp-os-api` | Supabase `77xp-os` | `main` |

- Backend: `Dockerfile` multi-stage (JDK → JRE Alpine, usuário sem privilégios,
  `-XX:MaxRAMPercentage=60 -Xss512k -XX:+ExitOnOutOfMemoryError`), `render.yaml` com
  health check e segredos `sync:false`; notificação de deploy com falha ligada no Render
  (deploy que falha mantém a versão antiga no ar sem avisar).
- Pool de conexões menor que o limite do pooler do Supabase, considerando as duas
  instâncias que convivem durante um deploy.
- Frontend: `vercel.json` com rewrites de `/api/*` (teste e oficial) e fallback do painel
  para `index.html`.
- Como tudo mora no repositório 77.tech: no Render o serviço usa `rootDir: os/backend`; na
  Vercel o sistema novo é um **projeto separado** com diretório raiz `os/frontend`, e o
  projeto atual `77-tech` continua publicando o site atual até a troca. O
  `tsconfig.json`, o ESLint e os testes do site atual ignoram a pasta `os/`.

## Lições do Beto_Banco aplicadas

Levantadas na leitura do código do Beto_Banco em 18/09/2026. A primeira foi conferida
diretamente no código; as demais serão conferidas ao portar cada peça.

1. Portões de pagamento falsos/de teste só existem nos perfis `dev`/`test`, e nenhum
   segredo tem valor padrão escrito no código (no Beto_Banco o gateway falso está ativo em
   produção com segredo padrão — conferido; correção em andamento em outra sessão).
2. Processamento de filas com uma transação por item, chamada por outro bean (evita o
   `@Transactional` ignorado por chamada interna) e trava `SKIP LOCKED` mantida durante o
   processamento.
3. Lista de módulos do ArchUnit descoberta automaticamente.
4. RLS por organização realmente ligado (seção acima).
5. Limite de tentativas pelo IP real do cliente.
6. Swagger fora de produção.
7. `.env.example` igual ao que o código lê; um só nome para cada variável.
8. Scripts de teste e de checagem de tipos que checam de verdade.
9. Render no plano pago (o grátis dorme e bloqueia as portas de SMTP).

## Fora da Fundação

Leads e CRM, catálogo e preços, calculadora, propostas, pagamentos e assinaturas, clientes
e sistemas, projetos, dashboard analítico, portfólio, blog, login com Google, verificação
em duas etapas, migração dos dados do 77.tech (acontece na troca, etapa 4).

Também fora: o conteúdo da Área do cliente, que chega com cada módulo; e a ligação da conta
de cliente à ficha da empresa, com o banco separando os dados também por cliente
(etapa 3).

## Pronto quando

1. `docker compose -f os/docker-compose.yml up` sobe tudo no computador e o README explica
   como usar.
2. O dono entra pelo primeiro acesso, troca a senha, a sessão renova sozinha e a saída
   funciona; o reuso de um refresh token derruba todas as sessões (teste automático).
3. O teste com duas organizações prova o isolamento.
4. Login, falhas de login e mudanças no painel aparecem na auditoria, que não pode ser
   alterada.
5. O e-mail de redefinição de senha sai pela fila (Mailpit no local; Resend no teste).
6. A página inicial pública vem com o conteúdo no HTML (teste automático) e o painel
   funciona no celular sem nada saindo da tela.
7. CI verde; teste e oficial publicados, com health check respondendo.
8. `.env.example`, README e o passo a passo de publicação em português.
9. O dono convida um cliente pelo painel; o cliente recebe o e-mail, cria a senha e entra na
   Área do cliente; um cliente não abre nada do painel de administração.

## Pontos a verificar na implementação

- Atributos do papel `postgres` no Supabase (`BYPASSRLS`?) e a criação do papel `app_77xp`.
- Nome exato do endereço fixo do branch `teste` na Vercel, para o rewrite por `host`.
- Cabeçalho confiável de IP do cliente no Render.
- Plano da Vercel (o Hobby é só para uso pessoal).
