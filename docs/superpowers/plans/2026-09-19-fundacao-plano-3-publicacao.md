# Fundação — Plano 3: Publicação — Plano de implementação

**Objetivo:** pôr o 77xp OS no ar num subdomínio, em dois ambientes (teste e oficial),
sem tocar no site 77xp.tech, que continua respondendo pelo domínio principal.

**Spec:** `docs/superpowers/specs/2026-09-18-fundacao-design.md`, seção "Publicação". Ela
é a autoridade; onde este plano e a spec discordarem, vale a spec.

**Planos 1 e 2:** prontos. 309 testes passando em containers (236 backend, 67 frontend,
6 ponta a ponta).

---

## Suposições que este plano assume — confira antes de começar

Este plano foi escrito depois de duas perguntas ficarem sem resposta. Ele segue o caminho
recomendado; se você discordar de alguma coisa aqui, é mais barato corrigir agora.

1. **Subdomínio agora, domínio depois.** O OS vai para `app.77xp.tech` (ou outro nome que
   você escolher). O `77xp.tech` continua sendo o site Next.js, intocado. O dia em que o
   OS assumir o domínio é outra etapa, com plano próprio.
2. **O admin atual continua no ar — por enquanto.** Este plano não desliga nem migra nada
   do `/admin`. O dono já decidiu que o OS **vai substituí-lo**, preservando as 19
   características levantadas em
   `docs/superpowers/levantamentos/2026-09-19-caracteristicas-a-preservar.md`, mas isso é
   trabalho das etapas 2 a 4. Publicar primeiro, num subdomínio, é o que permite usar o
   OS enquanto ele cresce — sem tirar nada do ar.
3. **Supabase novo, separado.** Dois projetos novos (`77xp-os-teste` e `77xp-os`),
   nenhum deles é o Supabase do site nem o "Banco" do Beto_Banco. **Nada será tocado nos
   bancos existentes.**
4. **Render no plano pago.** O plano grátis dorme e bloqueia as portas de SMTP — sem
   e-mail, não há convite nem recuperação de senha, e metade do sistema para de
   funcionar. Custo estimado: US$ 7/mês por serviço, dois serviços.

Se qualquer uma destas quatro estiver errada, me diga antes da Tarefa 1.

---

## Restrições globais

- **Nenhum segredo passa por mim.** Eu escrevo os arquivos de configuração com os nomes
  das variáveis e deixo os valores vazios (`sync: false` no Render). **Quem digita chave
  é você**, nos painéis da Vercel, do Render e do Supabase. Não peço chave no chat, não
  leio `.env`, não mostro valor de variável.
- **O site atual não muda.** Uma exceção prevista na Tarefa 6, que você autoriza
  separadamente: acrescentar o subdomínio ao DNS não altera o site, mas mexe na zona.
- Tudo o que for automatizável roda em container ou no CI. Nada de instalar Java, Node
  ou `psql` no Windows.
- Cada tarefa termina num commit convencional em inglês, com as linhas de atribuição.
- **Publicar é irreversível na prática.** Cada tarefa que muda algo fora do repositório
  (criar serviço, apontar DNS, rodar migração em banco de verdade) só acontece depois do
  seu "pode", e um "pode" vale para uma vez só.

---

## O desenho

```
Navegador
   │
   ▼
Vercel — projeto "77xp-os" (raiz: os/frontend)
   │   páginas públicas pré-geradas + painel
   │   /api/*  ──rewrite──►  Render
   ▼
Render — "77xp-os-api" (raiz: os/backend, Docker)
   │
   ▼
Supabase — PostgreSQL 17 "77xp-os"
```

Por que a Vercel repassa `/api/*` em vez de o navegador falar direto com o Render: o
cookie de sessão é `SameSite` e `HttpOnly`. Se a tela estiver num endereço e a API em
outro, o cookie não volta e ninguém continua logado. Com o repasse, tela e API ficam no
mesmo endereço aos olhos do navegador.

| Ambiente | Frontend | Backend | Banco | Branch |
|---|---|---|---|---|
| Local | Vite (container) | Spring (container) | Postgres (container) | qualquer |
| Teste | Vercel, endereço fixo do branch | Render `77xp-os-api-teste` | Supabase `77xp-os-teste` | `teste` |
| Oficial | Vercel, produção | Render `77xp-os-api` | Supabase `77xp-os` | `main` |

---

## Tarefas

### Tarefa 1: Dockerfile do backend

**Arquivos:** `os/backend/Dockerfile`, `os/backend/.dockerignore`.

**Regras:**
- Duas etapas: JDK para compilar, JRE Alpine para rodar. A imagem final não carrega o
  Maven nem o código-fonte.
- Roda com **usuário sem privilégios**, nunca root.
- Memória: `-XX:MaxRAMPercentage=60 -Xss512k -XX:+ExitOnOutOfMemoryError`. O último é o
  que importa: sem ele, um vazamento de memória deixa o serviço vivo e inútil, respondendo
  devagar para sempre em vez de reiniciar.
- `.dockerignore` exclui `target/`, `.git`, `.env*`.
- O build **roda os testes**. Imagem que compila mas não passa nos testes não existe.

**Prova:** `docker build` termina; `docker run` sobe e o `/api/v1/actuator/health`
responde; `docker image inspect` mostra usuário diferente de root; a imagem final não
contém `.java` nem `.env`.

---

### Tarefa 2: `render.yaml`

**Arquivos:** `os/render.yaml`.

**Regras:**
- Dois serviços: `77xp-os-api` (branch `main`) e `77xp-os-api-teste` (branch `teste`),
  ambos `rootDir: os/backend`, runtime Docker, plano Starter.
- `healthCheckPath: /api/v1/actuator/health`. O Render usa isso para não mandar tráfego
  para uma instância que ainda está subindo.
- **Todos os segredos com `sync: false`**: `DATABASE_URL`, `DATABASE_USER`,
  `DATABASE_PASSWORD`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `JWT_SECRET`, `SMTP_HOST`,
  `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `APP_BASE_URL`,
  `CORS_ALLOWED_ORIGINS`, `BOOTSTRAP_OWNER_EMAIL`. Nenhum valor no arquivo.
- Variáveis **sem** segredo podem ter valor: `SPRING_PROFILES_ACTIVE: prod`.

**Prova:** um teste automatizado lê o `render.yaml` e falha se qualquer variável da lista
de segredos aparecer com valor escrito. É o mesmo cuidado do `EnvExampleTest` que já
existe: o que protege não é a boa intenção, é o teste.

---

### Tarefa 3: Perfil de produção do backend

**Arquivos:** `os/backend/src/main/resources/application-prod.yml`,
`os/backend/.env.example`.

**Regras:**
- **Nenhum valor padrão para segredo.** Se `JWT_SECRET` faltar, a aplicação **não sobe**.
  Subir com um segredo padrão é pior do que não subir: ninguém percebe.
- `cookie-secure: true` (em produção tem HTTPS), `SameSite=Lax`.
- Swagger e `springdoc` **desligados**.
- Actuator: só `health` e `info`. Nada de `env`, `beans` ou `heapdump` expostos.
- `ddl-auto: validate`, Flyway com usuário próprio (o dono das tabelas), aplicação com
  `app_77xp` (`NOBYPASSRLS`).
- **Pool de conexões**: resolver a pendência 8.3 do relatório técnico. A gravação da
  auditoria abre transação nova e segura duas conexões ao mesmo tempo; durante um deploy
  convivem duas instâncias. O tamanho tem de caber no limite do pooler do Supabase
  considerando `2 instâncias × pool × 2 conexões`. Definir o número com essa conta, não
  por chute, e deixar a conta escrita em comentário.
- Log em produção: nível `INFO` para `com.xp77.os`. O `DEBUG` do
  `OrgAwareJpaTransactionManager` que ajuda no local encheria o disco lá.

**Prova:** um teste sobe o contexto com o perfil `prod` e variáveis faltando, e espera
falha; outro confere que o Swagger não responde; outro confere que `/actuator/env` dá
404.

---

### Tarefa 4: `vercel.json` do frontend

**Arquivos:** `os/frontend/vercel.json`.

**Regras:**
- `rewrites`: `/api/(.*)` → o Render do ambiente. **Dois destinos**, e o jeito de
  escolher entre teste e produção **precisa ser verificado na implementação** — a spec
  marca isso como dúvida em aberto e eu não vou fingir que sei.
- Fallback do painel: qualquer rota não encontrada serve o `index.html`, senão recarregar
  a página em `/painel/contas` dá 404.
- **Este arquivo fica em `os/frontend/`, não na raiz.** O `vercel.json` da raiz é do site
  atual e não se mexe.
- Cabeçalhos de segurança: `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY`. Uma linha cada, e evitam três famílias de ataque.

**Prova:** `npm run build` gera o `dist/`; um teste confere que o `vercel.json` tem o
fallback e o rewrite; depois de publicado, abrir `/painel/contas` direto na barra de
endereço funciona.

---

### Tarefa 5: CI de publicação e verificação prévia

**Arquivos:** `.github/workflows/os-backend.yml` e `os-frontend.yml` (ajustes).

**Regras:**
- O CI do backend passa a construir a imagem Docker também — descobrir que o Dockerfile
  quebrou só na hora do deploy é tarde.
- O CI do frontend passa a rodar o `vite build` com as variáveis de produção.
- **Nenhum dos dois publica.** Quem publica é o Render e a Vercel, ao receber push na
  branch. O CI só diz se está apto.

**Prova:** um push na branch faz os dois workflows passarem verdes, incluindo o build da
imagem.

---

### Tarefa 6: Criar a infraestrutura (você, com meu roteiro)

**Isto não é código.** É uma sequência de passos nos painéis, e **quem faz é você** —
são os lugares onde as chaves moram.

Eu entrego um roteiro passo a passo em `docs/etapas/publicacao-passo-a-passo.md`, na sua
linguagem, com uma coisa por vez. A ordem importa:

1. **Supabase**: criar `77xp-os-teste`. Anotar a URL de conexão (você anota, eu não vejo).
2. **Supabase**: rodar o SQL que cria o papel `app_77xp` (`NOBYPASSRLS`, não dono). Eu
   escrevo o SQL, você cola no painel. **Sem esse passo o RLS não protege nada** — a
   aplicação entraria como dona das tabelas e passaria por cima da regra.
3. **SMTP**: escolher o provedor de e-mail e pegar as credenciais. Sem isso, convite e
   recuperação de senha não funcionam.
4. **Render**: criar o serviço a partir do `render.yaml`, preencher as variáveis, ligar
   a **notificação de falha de deploy**. Sem ela, um deploy quebrado mantém a versão
   antiga no ar sem avisar ninguém.
5. **Vercel**: criar o projeto novo `77xp-os` com raiz `os/frontend`. **Não mexer no
   projeto `77-tech`.**
6. **DNS**: apontar o subdomínio. É o único passo que toca a zona do domínio.

**Prova:** o `/api/v1/actuator/health` do Render responde; a tela abre no subdomínio; o
login funciona de ponta a ponta no ambiente de teste.

---

### Tarefa 7: Primeira subida do ambiente de teste

**Regras:**
- Push na branch `teste` (com sua autorização) dispara o deploy dos dois.
- O Flyway roda as migrações V1 a V7 no Supabase de teste, sozinho, na primeira subida.
- `BOOTSTRAP_OWNER_EMAIL` cria o dono e manda o e-mail de primeiro acesso. **Você** abre
  o link e escolhe a senha. Eu nunca vejo essa senha.

**Prova — e esta é a que vale:** rodar o e2e contra o ambiente de teste publicado, não
contra o local. `E2E_BASE_URL=https://<endereço de teste> npm run e2e`. Se os 6 passarem
lá, o sistema funciona de verdade num servidor de verdade.

> **Aviso honesto:** o e2e lê o convite no Mailpit. No ambiente publicado não há Mailpit.
> Isto precisa ser resolvido na execução: ou o e2e publicado usa uma caixa de e-mail de
> teste do provedor SMTP, ou essa parte roda só no local. **Não vou fingir que já sei
> qual.** É a única parte deste plano sem resposta pronta.

---

### Tarefa 8: Subida oficial

**Regras:**
- Só depois do ambiente de teste rodar por alguns dias sem susto. O número de dias é sua
  decisão.
- Mesma sequência, com os projetos oficiais.
- `main` só recebe merge com sua autorização explícita.

**Prova:** e2e contra o oficial; `/api/v1/actuator/health` respondendo; o dono entra.

---

### Tarefa 9: O que fazer quando quebrar

**Arquivos:** `docs/etapas/quando-quebrar.md`.

Documento curto, em português simples, respondendo:

- Como voltar para a versão anterior (Render e Vercel guardam as anteriores).
- Como ver o que aconteceu (logs do Render, logs da Vercel, `X-Trace-Id` na resposta).
- O que fazer se o banco não responder.
- O que fazer se o e-mail parar de sair (a fila acumula e tenta de novo — não se perde).
- Quem avisa quando cai: a notificação do Render.

**Por que isto é uma tarefa e não um apêndice:** a hora de escrever isso é antes de
precisar. Depois de quebrar, ninguém escreve documentação — sai apagando incêndio.

---

## O que este plano NÃO faz

- Não desliga o site 77xp.tech, não mexe no projeto `77-tech` da Vercel, não toca no
  Supabase do site nem no "Banco" do Beto_Banco.
- Não migra nenhum dado do admin atual, nem constrói nenhuma das 19 características que
  ele tem hoje. Isso é o trabalho das etapas 2 a 4.
- Não faz backup automatizado nem monitoramento além da notificação do Render. Merece
  plano próprio quando houver dado de cliente de verdade.
- Não coloca o OS no domínio principal.

---

## Ordem de execução e onde eu paro

| Tarefa | Quem faz | Precisa de "pode"? |
|---|---|---|
| 1–5 | Eu, no repositório | Só para o push |
| 6 | **Você**, nos painéis | — |
| 7 | Eu (push) + você (senha do dono) | Sim |
| 8 | Eu (push) + você (merge) | Sim, separado |
| 9 | Eu, no repositório | Só para o push |

As tarefas 1 a 5 e a 9 são código e documentação: posso fazer todas seguidas. A 6 é sua.
A 7 e a 8 mexem com o que está no ar e param em você.
