# 77xp OS — backend

API do 77xp OS (Java 21, Spring Boot 3.5, PostgreSQL 17). Tudo roda em containers:
não é preciso instalar Java, Maven nem PostgreSQL no computador, só o Docker Desktop.

Os comandos abaixo rodam na **raiz do repositório** (a pasta `77.tech`).

## Subir o ambiente local

```bash
docker compose -f os/docker-compose.yml up -d postgres mailpit api
```

- API: http://localhost:8080/api/v1 — saúde em http://localhost:8080/api/v1/actuator/health
- Caixa de e-mail de teste (Mailpit): http://localhost:8025
- Documentação da API (só no local): http://localhost:8080/api/v1/swagger-ui.html

A primeira subida demora alguns minutos (baixa o Maven e as dependências). Para ver o
que a API está fazendo: `docker compose -f os/docker-compose.yml logs -f api`.

Para parar: `docker compose -f os/docker-compose.yml down`. Para apagar também o banco
local: `docker compose -f os/docker-compose.yml down -v`.

> O site atual (Next.js) tem outro `docker-compose.yml` na raiz, com outro nome de projeto.
> Os dois não se misturam, mas usam portas do computador: se algo já ocupa a 5432, 8080,
> 1025 ou 8025, pare o outro ambiente antes.

## Primeiro acesso do dono

Crie o arquivo `os/.env` (ele não vai para o git) com:

```
BOOTSTRAP_OWNER_EMAIL=seu-email@exemplo.com
```

e suba a API de novo. O dono da organização 77xp é criado e o e-mail de primeiro acesso
aparece no Mailpit (http://localhost:8025) em até 15 segundos. O link leva à tela
`/primeiro-acesso` do painel. Enquanto o painel novo não existir, dá para criar a senha
direto na API, com o token do link:

```bash
curl -X POST http://localhost:8080/api/v1/auth/first-access \
  -H 'Content-Type: application/json' \
  -d '{"token":"COLE-AQUI-O-TOKEN-DO-LINK","password":"uma-senha-forte"}'
```

## Testes

```bash
# suíte inteira (a mesma do GitHub Actions)
docker compose -f os/docker-compose.yml run --rm backend-tests

# uma classe só
docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=AuthEndpointsTest test
```

O resultado é o **código de saída** do comando (`echo $?` no Bash, `$LASTEXITCODE` no
PowerShell): 0 é sucesso. Não filtre a saída do Maven com `grep` para decidir se passou.

Os testes sobem um PostgreSQL 17 e um Mailpit descartáveis com Testcontainers, usando o
Docker do computador pelo socket montado no serviço `backend-tests`. Se aparecer um erro
do "Ryuk" (o limpador do Testcontainers), rode com
`docker compose -f os/docker-compose.yml run --rm -e TESTCONTAINERS_RYUK_DISABLED=true backend-tests`
e, depois, apague as sobras com `docker rm -f $(docker ps -aq --filter label=org.testcontainers=true)`.

## Variáveis de ambiente

Todas estão em [`.env.example`](.env.example), com a explicação de cada uma. Em produção
(perfil `prod`), nenhum segredo tem valor padrão: faltou uma variável, a API não sobe.

## Como o isolamento por organização funciona

- Toda tabela que pertence a uma organização tem `org_id` e RLS (`ENABLE` + `FORCE`).
- A API conecta com o papel `app_77xp`, que não é dono das tabelas nem tem `BYPASSRLS`;
  as migrações (Flyway) rodam com o papel dono.
- No início de cada transação a API informa a organização ao banco
  (`set_config('app.org_id', …, true)`): a do token de quem está logado ou, nas rotas
  públicas, a do domínio (padrão: 77xp). Sem organização, o banco não mostra nada.

## Perfis

| Perfil | Onde | Observações |
|---|---|---|
| `dev` | `docker compose` | padrões locais, cookie sem `Secure`, documentação da API ligada |
| `test` | testes automáticos | segredos fixos de teste, tarefas em segundo plano desligadas |
| `prod` | Render (teste e oficial) | todos os segredos obrigatórios, logs em JSON, sem documentação da API |
