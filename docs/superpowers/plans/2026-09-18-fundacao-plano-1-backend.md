# Fundação — Plano 1: Backend — Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** entregar o backend da Fundação do 77xp OS — login seguro com sessões rotativas, contas só por convite com Área do cliente, organizações com RLS realmente ligado, auditoria só de inserção e fila de e-mail — portando e corrigindo as peças testadas do Beto_Banco, tudo rodando e testado em containers.

**Arquitetura:** Spring Boot 3.5 modular (pacote `com.xp77.os`, um subpacote por módulo com `api/`, `controller/`, `dto/`, `entity/`, `repository/`, `service/`), PostgreSQL 17 com Flyway. A aplicação conecta com o papel `app_77xp` (sem `BYPASSRLS`, não dono) e um `JpaTransactionManager` próprio informa `app.org_id` ao banco no início de cada transação; a organização vem da claim `org` do JWT ou, nas rotas públicas, do domínio da requisição. Processos em segundo plano (fila de e-mail) usam uma transação por item, aberta por outro bean.

**Stack:** Java 21 · Spring Boot 3.5.6 (Web, Security, Data JPA, Validation, Actuator, Mail) · Flyway · PostgreSQL 17 · jjwt 0.12.6 · Bucket4j 8.14.0 · springdoc 2.8.6 · JUnit 5 + Testcontainers 1.21.4 + ArchUnit 1.3.0 · Docker Compose · GitHub Actions.

**Spec:** docs/superpowers/specs/2026-09-18-fundacao-design.md

## Restrições globais

- Java 21; Spring Boot 3.5.6 (`spring-boot-starter-parent`, mesma versão do Beto_Banco); Maven pelo wrapper copiado do Beto_Banco (`os/backend/mvnw`, Maven 3.9.16).
- Pacote raiz `com.xp77.os`; classe principal `com.xp77.os.Xp77OsApplication`; módulos da Fundação: `shared`, `config`, `security`, `auth`, `users`, `organizations`, `audit`, `email` e `accounts` (contas por convite e Área do cliente, D10).
- Context path `/api/v1`; health em `/api/v1/actuator/health`; o Actuator expõe só `health` e `info`.
- PostgreSQL 17 (`postgres:17-alpine`); migrações exatamente: V1 extensões, V2 `organizations`, V3 `users` + `memberships`, V4 papel `app_77xp` + permissões padrão + RLS em `memberships`, V5 `refresh_tokens` + `password_reset_tokens`, V6 `audit_logs`, V7 `email_outbox`; Hibernate só valida (`ddl-auto: validate`).
- Organização raiz: id `00000000-0000-4000-8000-000000000001`, nome `77xp`, slug `77xp`.
- Tabela de organização: `org_id uuid NOT NULL` + índice + `ENABLE` e `FORCE ROW LEVEL SECURITY` com a política `USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid) WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid)`; sem exceção para `app.org_id` vazio.
- A aplicação conecta como `app_77xp` (LOGIN, NOBYPASSRLS, não dono); o Flyway roda como o dono (`FLYWAY_USER`/`FLYWAY_PASSWORD`, URL = `DATABASE_URL`). A senha de `app_77xp` nunca está numa migração.
- Variáveis de ambiente, nomes exatos e só estas: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `FLYWAY_USER`, `FLYWAY_PASSWORD`, `JWT_SECRET`, `MAX_ACTIVE_SESSIONS`, `CORS_ALLOWED_ORIGINS`, `APP_BASE_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, `BOOTSTRAP_OWNER_EMAIL`, `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE`.
- Variáveis de ambiente só aparecem nos arquivos `application*.yml`; o código Java lê apenas propriedades (`xp77.*`, `spring.*`).
- No perfil `prod` nenhum segredo tem valor padrão (`${VAR}` sem `:`); springdoc desligado; logs em JSON.
- JWT HS256 de 15 min com claims `sub`, `jti`, `email`, `org`, `roles`; a aplicação não sobe com `JWT_SECRET` menor que 32 bytes.
- Refresh token: 32 bytes aleatórios, só o SHA-256 no banco, 30 dias, rotação com `replaced_by`; reuso revoga todas as sessões do usuário e responde 401; `MAX_ACTIVE_SESSIONS` padrão 3 (aparelho novo derruba a sessão mais antiga).
- Cookie `xp_refresh`: `HttpOnly`, `Secure` (desligável só em dev/test), `SameSite=Lax`, `Path=/api/v1/auth`.
- Token de primeiro acesso: finalidade `FIRST_ACCESS`, 72 h. Redefinição: `RESET`, 1 h. Senhas: `DelegatingPasswordEncoder` com `{argon2}` padrão.
- Papéis `OWNER`, `ADMIN`, `TEAM`, `CLIENT` existem só em `memberships.role` (com situação `ACTIVE`/`BLOCKED` e último acesso no mesmo vínculo); `/admin/**` exige `ROLE_OWNER` ou `ROLE_ADMIN`; `/portal/**` exige `ROLE_CLIENT`. Contas só por convite (D10); o `OWNER` nasce só pelo comando de inicialização.
- Login numa organização exige pessoa `ACTIVE` e vínculo `ACTIVE` naquela organização; bloquear um vínculo revoga na hora todas as sessões (refresh tokens) da pessoa.
- Fila de e-mail: ciclo a cada 15 s, até 20 mensagens por ciclo, uma transação por mensagem com `FOR UPDATE SKIP LOCKED` mantido durante o envio; backoff 1 min, 5 min, 30 min, 2 h, 12 h e depois `FAILED`.
- Limite de tentativas pelo IP confiável do cliente: `xp77.rate-limit.trusted-proxy-hops` (padrão 1) define quantos proxies confiáveis existem; nunca se usa o primeiro valor de `X-Forwarded-For`.
- Repositório: o sistema novo vive dentro do repositório `77.tech` (`C:\Users\wende\dev\77.tech`, no Bash `/c/Users/wende/dev/77.tech`), todo sob `os/` (`os/backend/`, `os/docker-compose.yml`, `os/docker/`, `os/.gitignore`); a documentação fica em `docs/` e o CI em `.github/workflows/os-backend.yml`. Este plano não toca em mais nada: o site Next.js da raiz (`src/`, `package.json`, `tsconfig.json`, `vercel.json`, o `docker-compose.yml` da raiz — projeto `77tech`) fica intacto.
- Tudo roda em containers. Comandos a partir da raiz do repositório (`cd /c/Users/wende/dev/77.tech` no Bash), sempre com o arquivo explícito: `docker compose -f os/docker-compose.yml …` (projeto `xp77-os`; os caminhos relativos do compose partem de `os/`). Testes sempre com `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B ...`. O resultado é o **código de saída** do Maven (`echo $?` no Bash, `$LASTEXITCODE` no PowerShell), nunca filtrado por `| grep`.
- TDD: todo comportamento começa por um teste que falha pelo motivo certo; a tarefa só fecha com a suíte inteira passando.
- Identificadores (classes, métodos, campos) em inglês; comentários de código e textos para o usuário (mensagens de erro, e-mails) em português.
- Git: o branch `feat/fundacao-backend` (criado a partir do `teste` do 77.tech pelo coordenador, junto com o commit da documentação) já existe; a Tarefa 1 só confere. Comandos git sempre a partir da raiz do repositório; cada tarefa termina num commit convencional em inglês cuja última linha é `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Beto_Banco (`C:\Users\wende\OneDrive\Documentos\Beto_project\Beto_Banco\backend`, no Bash `/c/Users/wende/OneDrive/Documentos/Beto_project/Beto_Banco/backend`) é só leitura: nunca modificar, nunca rodar git lá, nunca copiar valores de `.env`. Não portar gateway falso, cadastro público, login com Google, alunos, cursos, pagamentos nem leads.

---

## Mapa de arquivos

```
(raiz do repositório 77.tech — o site Next.js da raiz não é tocado)
.github/workflows/os-backend.yml     CI: ./mvnw -B verify em os/backend
docs/superpowers/...                 spec e planos
os/
  docker-compose.yml                 postgres, mailpit, api e backend-tests (projeto xp77-os)
  docker/postgres/01-app-role.sql    cria app_77xp (senha 'app') no Postgres local
  .gitignore                         .env do compose (os/.env)
os/backend/
  pom.xml  mvnw  .mvn/wrapper/maven-wrapper.properties  .gitattributes  .gitignore
  .env.example  README.md
  src/main/java/com/xp77/os/
    Xp77OsApplication.java
    shared/exception/   BusinessException, ErrorCode, ErrorPayload, FieldErrorItem,
                        GlobalExceptionHandler, NotFoundException
    shared/pagination/  PageRequestFactory
    shared/response/    ApiResponse, PageResponse, PaginationMeta
    shared/trace/       TraceIdFilter
    config/             OrgAwareJpaTransactionManager, TransactionConfig, PasswordEncoderConfig,
                        SchedulingConfig, OpenApiConfig
    organizations/api/  OrgContext, OrgResolver, RootOrganization, OrganizationDirectory,
                        OrganizationSummary
    organizations/entity|repository|service/  Organization, OrganizationRepository, DomainOrgResolver,
                                              OrganizationDirectoryService
    users/api/          UserAccount, UserDirectory, MembershipDirectory, MembershipRole, MemberSummary
    users/entity|repository|service/  User, Membership, UserRepository, MembershipRepository,
                                      UserDirectoryService, MembershipDirectoryService
    security/           AuthenticatedUser, JwtService, JwtAuthFilter, SecurityConfig,
                        EnvelopeAuthenticationEntryPoint, EnvelopeAccessDeniedHandler,
                        OrgContextFilter, ClientIpResolver, RateLimitFilter
    auth/controller/    AuthController, PasswordController
    auth/dto/           LoginRequest, TokenResponse, MeResponse, ChangePasswordRequest,
                        ForgotPasswordRequest, SetPasswordRequest
    auth/api/           FirstAccessTokens, SessionRevocation
    auth/entity/        RefreshToken, PasswordResetToken, TokenPurpose
    auth/repository/    RefreshTokenRepository, PasswordResetTokenRepository
    auth/service/       OpaqueTokens, RefreshTokenService, RefreshCookies, AuthService,
                        PasswordResetService, OwnerBootstrapService, OwnerBootstrapRunner,
                        SessionRevocationService
    accounts/controller/  AdminUsersController (/admin/users/**), PortalController (/portal/me)
    accounts/dto/       InvitationRequest, MemberResponse, PortalMeResponse
    accounts/service/   AccountsService
    email/api/          EmailService
    email/entity|repository/  EmailOutbox, EmailOutboxRepository
    email/service/      EmailOutboxService, EmailTemplates, EmailSender, SmtpEmailSender,
                        EmailOutboxProcessor, EmailDispatcher
    audit/api/          AuditLogger
    audit/entity|repository/  AuditLog, AuditLogRepository
    audit/service/      AuditLoggerImpl
    audit/web/          AdminAuditInterceptor, AdminRequestBodyCachingFilter,
                        RequestBodySummary, AuditWebConfig
    audit/dto|controller/  AuditLogResponse, AdminAuditLogController
  src/main/resources/
    application.yml  application-dev.yml  application-test.yml  application-prod.yml
    logback-spring.xml
    db/migration/V1__extensions.sql ... V7__email_outbox.sql
  src/test/resources/db/testcontainers-init.sql
  src/test/java/com/xp77/os/support/  PostgresTestBase, TestData, TestAuth
  src/test/java/archfixtures/...      classes de mentira que provam as regras do ArchUnit
```

## Ordem das tarefas e ajustes em relação à lista combinada

1. Esqueleto + containers · 2. `shared` · 3. ArchUnit · 4. V1–V3 + entidades · 5. V4 + contexto de organização + isolamento · 6. Serviços de `users` + codificador de senha · 7. JWT + cadeia de segurança · 8. V5 + sessões · 9. Endpoints de login · 10. V7 + fila de e-mail · 11. Redefinição, primeiro acesso, e-mail de convite e dono inicial · 12. Limite de tentativas · 13. V6 + auditoria · 14. Contas de acesso e Área do cliente (API) · 15. OpenAPI, `.env.example`, README, CI e verificação final.

- A antiga tarefa 5 virou 5 e 6: os serviços de `users` só podem ser testados com o papel `app_77xp` depois que a V4 concede as permissões, e um revisor consegue aprovar o isolamento (5) sem aprovar os serviços (6). O `PasswordEncoderConfig` vai para a 6 porque o `UserDirectoryService` depende dele.
- `ClientIpResolver` nasce na Tarefa 9 (o login grava o IP da sessão) e é reusado pelo limite de tentativas (12) e pela auditoria (13).
- A Tarefa 14 (contas por convite e Área do cliente, decisão D10 da spec) entrou depois da aprovação da mudança de spec: usa o e-mail de convite (11), o limite de tentativas não se aplica a ela e a auditoria automática de `/admin/**` (13) registra cada ação.
- A V7 (Tarefa 10) é criada antes da V6 (Tarefa 13), seguindo a ordem combinada. Os testes sobem um banco novo a cada execução e aplicam V1…V7 em ordem, sem problema; mas se o banco **local** (`docker compose -f os/docker-compose.yml up`) tiver rodado entre as Tarefas 10 e 13, o Flyway recusa a V6 “fora de ordem”. Nesse caso: `docker compose -f os/docker-compose.yml down -v` e suba de novo (a Tarefa 13 repete este aviso).


### Tarefa 1: Esqueleto do backend e ambiente em containers

**Arquivos:**
- Create: `os/backend/pom.xml`, `os/backend/mvnw` (cópia), `os/backend/.mvn/wrapper/maven-wrapper.properties` (cópia), `os/backend/.gitattributes`, `os/backend/.gitignore`, `os/.gitignore`
- Create: `os/docker-compose.yml`, `os/docker/postgres/01-app-role.sql`
- Create: `os/backend/src/main/java/com/xp77/os/Xp77OsApplication.java`
- Create: `os/backend/src/main/resources/application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml`, `logback-spring.xml`
- Create: `os/backend/src/test/resources/db/testcontainers-init.sql`, `os/backend/src/test/java/com/xp77/os/support/PostgresTestBase.java`
- Test: `os/backend/src/test/java/com/xp77/os/ApplicationSmokeTest.java`

**Interfaces:**
- Consumes: nada.
- Produces: `com.xp77.os.Xp77OsApplication`; `com.xp77.os.support.PostgresTestBase` (classe abstrata `@SpringBootTest @ActiveProfiles("test")` com `protected static final PostgreSQLContainer<?> POSTGRES` e `protected static JdbcTemplate ownerJdbc()` — conexão como dono `xp77`, que ignora RLS); a aplicação conecta como `app_77xp`/`app`. Serviço `backend-tests` do compose. Âncoras do `pom.xml` usadas pelas tarefas seguintes: dependências principais entram logo antes da linha `        <!-- Testes -->`; dependências de teste entram logo antes de `    </dependencies>`.

- [ ] **Passo 0: Entrar no branch de trabalho**

```bash
cd /c/Users/wende/dev/77.tech
git checkout feat/fundacao-backend
git branch --show-current
```

Expected: o último comando imprime `feat/fundacao-backend`. Se o branch não existir, pare e peça ao coordenador (ele o cria a partir do `teste` com o commit da documentação).

- [ ] **Passo 1: Copiar o Maven Wrapper do Beto_Banco**

```bash
cd /c/Users/wende/dev/77.tech
BETO=/c/Users/wende/OneDrive/Documentos/Beto_project/Beto_Banco/backend
mkdir -p os/backend/.mvn/wrapper
cp "$BETO/mvnw" os/backend/mvnw
cp "$BETO/.mvn/wrapper/maven-wrapper.properties" os/backend/.mvn/wrapper/maven-wrapper.properties
chmod +x os/backend/mvnw
```

- [ ] **Passo 2: Criar `os/backend/pom.xml`**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.6</version>
        <relativePath/>
    </parent>
    <groupId>com.xp77</groupId>
    <artifactId>os-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>xp77-os-backend</name>
    <description>Backend do 77xp OS</description>

    <properties>
        <java.version>21</java.version>
        <testcontainers.version>1.21.4</testcontainers.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>net.logstash.logback</groupId>
            <artifactId>logstash-logback-encoder</artifactId>
            <version>8.0</version>
        </dependency>
        <!-- Testes -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Passo 3: Criar `os/backend/.gitattributes`, `os/backend/.gitignore` e `os/.gitignore`**

`os/backend/.gitattributes`:

```
# Scripts executados dentro dos containers Linux: sempre LF.
/mvnw text eol=lf
*.sh text eol=lf
```

`os/backend/.gitignore`:

```
target/
.mvn/wrapper/maven-wrapper.jar
.env

### IDEs ###
.idea/
*.iml
*.iws
*.ipr
.vscode/
.classpath
.project
.settings/
.factorypath
```

`os/.gitignore` (o `.gitignore` da raiz é do site Next.js e não muda):

```
# Variáveis locais lidas pelo docker compose do 77xp OS (os/.env, ex.: BOOTSTRAP_OWNER_EMAIL).
.env
```

- [ ] **Passo 4: Criar `os/docker/postgres/01-app-role.sql` e `os/docker-compose.yml`**

`os/docker/postgres/01-app-role.sql`:

```sql
-- Só para o ambiente local (docker compose). Roda uma única vez, quando o volume
-- do Postgres é criado. Cria o papel com que a aplicação conecta ANTES do Flyway:
-- a V4 só cria o papel se ele não existir e nunca define senha. Em teste e
-- oficial (Supabase) o papel é criado pelo passo a passo de publicação (plano 3).
CREATE ROLE app_77xp LOGIN PASSWORD 'app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
```

`os/docker-compose.yml`:

```yaml
# Ambiente local do 77xp OS. Tudo roda em containers. Rode da raiz do repositório 77.tech;
# os caminhos relativos daqui partem de os/ (./ = os/, /app/backend = os/backend).
#   docker compose -f os/docker-compose.yml up -d                   -> postgres, mailpit e api (perfil dev)
#   docker compose -f os/docker-compose.yml run --rm backend-tests  -> suíte completa do backend (./mvnw -B verify)
# O docker-compose.yml da raiz é do site Next.js (projeto 77tech) e não tem relação com este.
# As variáveis SMTP_* e BOOTSTRAP_OWNER_EMAIL da api passam a ser lidas nas Tarefas 10 e 11.
name: xp77-os

services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: xp77
      POSTGRES_USER: xp77
      POSTGRES_PASSWORD: xp77
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./docker/postgres/01-app-role.sql:/docker-entrypoint-initdb.d/01-app-role.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U xp77 -d xp77"]
      interval: 5s
      timeout: 3s
      retries: 20

  mailpit:
    image: axllent/mailpit
    ports:
      - "1025:1025"
      - "8025:8025"

  api:
    image: maven:3.9-eclipse-temurin-21
    working_dir: /app/backend
    command: ["./mvnw", "-B", "spring-boot:run", "-Dspring-boot.run.profiles=dev"]
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/xp77
      DATABASE_USER: app_77xp
      DATABASE_PASSWORD: app
      FLYWAY_USER: xp77
      FLYWAY_PASSWORD: xp77
      SMTP_HOST: mailpit
      SMTP_PORT: "1025"
      BOOTSTRAP_OWNER_EMAIL: ${BOOTSTRAP_OWNER_EMAIL:-}
    ports:
      - "8080:8080"
    volumes:
      - ./:/app
      - maven-repo:/root/.m2
      # target/ num volume próprio: build rápido no Docker Desktop e sem disputa com os testes.
      - api-target:/app/backend/target
    depends_on:
      postgres:
        condition: service_healthy
      mailpit:
        condition: service_started

  backend-tests:
    image: maven:3.9-eclipse-temurin-21
    profiles: ["tests"]
    working_dir: /app/backend
    command: ["./mvnw", "-B", "verify"]
    environment:
      # O Testcontainers daqui de dentro cria containers "irmãos" no Docker do
      # computador; as portas deles são alcançadas pelo host.
      TESTCONTAINERS_HOST_OVERRIDE: host.docker.internal
    extra_hosts:
      - "host.docker.internal:host-gateway"
    volumes:
      - ./:/app
      - maven-repo:/root/.m2
      - tests-target:/app/backend/target
      - /var/run/docker.sock:/var/run/docker.sock

volumes:
  postgres-data:
  maven-repo:
  api-target:
  tests-target:
```

O Ryuk (limpeza automática do Testcontainers) fica **ligado**: com o socket montado ele funciona no Docker Desktop, e desligá-lo deixaria containers de Postgres órfãos a cada execução interrompida. O README (Tarefa 14) traz o contorno caso ele falhe numa máquina específica.

- [ ] **Passo 5: Escrever o teste de fumaça (falha primeiro)**

`os/backend/src/test/resources/db/testcontainers-init.sql`:

```sql
-- Papel da aplicação nos testes. Existe ANTES do Flyway, como no Supabase (onde o
-- passo a passo de publicação cria o papel com senha). A V4 só o cria se não existir.
CREATE ROLE app_77xp LOGIN PASSWORD 'app' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
```

`os/backend/src/test/java/com/xp77/os/support/PostgresTestBase.java`:

```java
package com.xp77.os.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base dos testes com banco. Um único Postgres 17 por execução da suíte.
 *
 * <p>Duas credenciais, como em produção: a aplicação conecta como app_77xp
 * (sem BYPASSRLS, não é dona das tabelas) e o Flyway como o dono. O
 * {@link #ownerJdbc()} conecta como o dono (superusuário no container, ignora RLS)
 * e serve para preparar e conferir dados por fora da aplicação.
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class PostgresTestBase {

    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("xp77")
                    .withUsername("xp77")
                    .withPassword("xp77")
                    .withInitScript("db/testcontainers-init.sql");

    private static JdbcTemplate owner;

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", () -> "app_77xp");
        registry.add("spring.datasource.password", () -> "app");
        registry.add("spring.flyway.user", POSTGRES::getUsername);
        registry.add("spring.flyway.password", POSTGRES::getPassword);
    }

    protected static synchronized JdbcTemplate ownerJdbc() {
        if (owner == null) {
            owner = new JdbcTemplate(new DriverManagerDataSource(
                    POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword()));
        }
        return owner;
    }
}
```

`os/backend/src/test/java/com/xp77/os/ApplicationSmokeTest.java`:

```java
package com.xp77.os;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ApplicationSmokeTest extends PostgresTestBase {

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void healthRespondsUpUnderTheContextPath() throws Exception {
        HttpResponse<String> response = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create(
                        "http://localhost:" + port + "/api/v1/actuator/health")).build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }

    @Test
    void applicationConnectsAsAppRoleAndOwnerIsSeparate() {
        assertThat(jdbc.queryForObject("select current_user", String.class)).isEqualTo("app_77xp");
        assertThat(ownerJdbc().queryForObject("select current_user", String.class)).isEqualTo("xp77");
    }

    @Test
    void databaseIsPostgres17() {
        assertThat(jdbc.queryForObject("show server_version", String.class)).startsWith("17.");
    }
}
```

- [ ] **Passo 6: Rodar o teste e ver falhar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=ApplicationSmokeTest test`
Expected: código de saída 1, `BUILD FAILURE`, com `Unable to find a @SpringBootConfiguration` (ainda não existe classe principal). A primeira execução baixa o Maven, as dependências e as imagens `postgres:17-alpine` e `testcontainers/ryuk` — demora alguns minutos.

- [ ] **Passo 7: Criar a classe principal, as configurações e o logback**

`os/backend/src/main/java/com/xp77/os/Xp77OsApplication.java`:

```java
package com.xp77.os;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Xp77OsApplication {

    public static void main(String[] args) {
        SpringApplication.run(Xp77OsApplication.class, args);
    }
}
```

`os/backend/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: xp77-os
  jpa:
    # Sem sessão aberta na view: toda consulta acontece dentro de uma transação,
    # que é onde app.org_id é informado ao banco.
    open-in-view: false
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  servlet:
    context-path: /api/v1
  error:
    include-stacktrace: never
    include-message: never

management:
  endpoints:
    web:
      exposure:
        include: health, info
  endpoint:
    health:
      probes:
        enabled: true
```

`os/backend/src/main/resources/application-dev.yml`:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/xp77}
    username: ${DATABASE_USER:app_77xp}
    password: ${DATABASE_PASSWORD:app}
  flyway:
    user: ${FLYWAY_USER:xp77}
    password: ${FLYWAY_PASSWORD:xp77}

logging:
  level:
    com.xp77.os: DEBUG
```

`os/backend/src/main/resources/application-test.yml`:

```yaml
# Perfil dos testes automáticos. Banco e credenciais vêm do Testcontainers
# (PostgresTestBase); aqui ficam só valores fixos de teste.
logging:
  level:
    com.xp77.os: INFO
```

`os/backend/src/main/resources/application-prod.yml`:

```yaml
# Produção (Render). Segredo nenhum tem valor padrão: faltou, a aplicação não sobe.
spring:
  datasource:
    url: ${DATABASE_URL}
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
    hikari:
      maximum-pool-size: ${SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE:5}
  flyway:
    user: ${FLYWAY_USER}
    password: ${FLYWAY_PASSWORD}

server:
  tomcat:
    threads:
      max: 120

logging:
  level:
    root: INFO
    com.xp77.os: INFO
```

`os/backend/src/main/resources/logback-spring.xml` (porta do Beto_Banco; o bloco de texto vale para todo perfil que não é `prod`, para nenhuma execução ficar sem log):

```xml
<configuration>
    <springProfile name="!prod">
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss.SSS} %-5level [%X{traceId:-sem-trace}] %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>traceId</includeMdcKeyName>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON"/>
        </root>
    </springProfile>
</configuration>
```

- [ ] **Passo 8: Rodar o teste e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=ApplicationSmokeTest test`
Expected: código de saída 0, `Tests run: 3, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 9: Conferir o ambiente local subindo de verdade**

```bash
cd /c/Users/wende/dev/77.tech
docker compose -f os/docker-compose.yml up -d postgres mailpit api
# a primeira subida da api compila o projeto; repita até responder (até ~3 min)
curl -fsS http://localhost:8080/api/v1/actuator/health
docker compose -f os/docker-compose.yml down
```

Expected: o `curl` imprime um JSON com `"status":"UP"`. Se falhar, `docker compose -f os/docker-compose.yml logs api` mostra o motivo.

- [ ] **Passo 10: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/.gitignore os/docker-compose.yml os/docker/postgres/01-app-role.sql os/backend/pom.xml os/backend/mvnw os/backend/.mvn os/backend/.gitattributes os/backend/.gitignore os/backend/src
git update-index --chmod=+x os/backend/mvnw
git commit -m "build(backend): bootstrap Spring Boot skeleton with containerized dev and test stack" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 2: Módulo `shared` (porta com testes)

**Arquivos:**
- Create (cópia): `os/backend/src/main/java/com/xp77/os/shared/exception/{BusinessException,ErrorCode,ErrorPayload,FieldErrorItem,NotFoundException,GlobalExceptionHandler}.java`, `shared/pagination/PageRequestFactory.java`, `shared/response/{ApiResponse,PageResponse,PaginationMeta}.java`, `shared/trace/TraceIdFilter.java`
- Test (cópia): `os/backend/src/test/java/com/xp77/os/shared/exception/GlobalExceptionHandlerTest.java`, `shared/pagination/PageRequestFactoryTest.java`, `shared/response/ApiResponseTest.java`, `shared/trace/TraceIdFilterTest.java`

**Interfaces:**
- Consumes: `PostgresTestBase` (Tarefa 1).
- Produces (assinaturas usadas daqui em diante):
  - `record ApiResponse<T>(boolean success, T data, Object error)` com `static <T> ApiResponse<T> ok(T data)` e `static ApiResponse<Void> error(Object error)`
  - `record PageResponse<T>(boolean success, List<T> data, PaginationMeta pagination)` com `static <T> PageResponse<T> from(Page<T> page)`; `record PaginationMeta(int page, int size, long totalElements, int totalPages)`
  - `enum ErrorCode` (`VALIDATION_ERROR(422)`, `MALFORMED_REQUEST(400)`, `CLIENT_ERROR(400)`, `UNAUTHORIZED(401)`, `FORBIDDEN(403)`, `RESOURCE_NOT_FOUND(404)`, `METHOD_NOT_ALLOWED(405)`, `NOT_ACCEPTABLE(406)`, `CONFLICT(409)`, `PAYLOAD_TOO_LARGE(413)`, `UNSUPPORTED_MEDIA_TYPE(415)`, `RATE_LIMIT_EXCEEDED(429)`, `INTERNAL_ERROR(500)`) com `int httpStatus()`
  - `record ErrorPayload(String code, String message, int status, String path, String traceId, String timestamp, List<FieldErrorItem> fieldErrors)`; `record FieldErrorItem(String field, String message)`
  - `class BusinessException extends RuntimeException` — `BusinessException(ErrorCode code, String message)`, `ErrorCode code()`; `class NotFoundException extends BusinessException` — `NotFoundException(String message)`
  - `final class PageRequestFactory` — `static Pageable of(Integer page, Integer size, String sort)`, `DEFAULT_SIZE = 20`, `MAX_SIZE = 100`
  - `class TraceIdFilter` (`@Component`, `HIGHEST_PRECEDENCE`) — `HEADER = "X-Trace-Id"`, `MDC_KEY = "traceId"`
  - `class GlobalExceptionHandler` (`@RestControllerAdvice`) — nesta tarefa **sem** o tratamento de `AccessDeniedException`, que volta na Tarefa 7 junto com o Spring Security.

Todos os arquivos desta tarefa são porta literal: só troca o pacote. As exceções: o `GlobalExceptionHandler` perde o método `negado` e o import de `AccessDeniedException` (o Spring Security ainda não está no projeto).

- [ ] **Passo 1: Copiar os testes**

```bash
cd /c/Users/wende/dev/77.tech
BETO=/c/Users/wende/OneDrive/Documentos/Beto_project/Beto_Banco/backend
T=os/backend/src/test/java/com/xp77/os/shared
mkdir -p $T/exception $T/pagination $T/response $T/trace
for f in exception/GlobalExceptionHandlerTest pagination/PageRequestFactoryTest response/ApiResponseTest trace/TraceIdFilterTest; do
  sed 's/com\.betobanco/com.xp77.os/g' "$BETO/src/test/java/com/betobanco/shared/$f.java" > "$T/$f.java"
done
```

- [ ] **Passo 2: Rodar os testes e ver falhar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='ApiResponseTest,PageRequestFactoryTest,TraceIdFilterTest,GlobalExceptionHandlerTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação dos testes com `package com.xp77.os.shared.response does not exist` (e equivalentes para `exception`, `pagination`, `trace`).

- [ ] **Passo 3: Copiar as classes de produção**

```bash
cd /c/Users/wende/dev/77.tech
BETO=/c/Users/wende/OneDrive/Documentos/Beto_project/Beto_Banco/backend
M=os/backend/src/main/java/com/xp77/os/shared
mkdir -p $M/exception $M/pagination $M/response $M/trace
for f in exception/BusinessException exception/ErrorCode exception/ErrorPayload exception/FieldErrorItem \
         exception/NotFoundException pagination/PageRequestFactory response/ApiResponse \
         response/PageResponse response/PaginationMeta trace/TraceIdFilter; do
  sed 's/com\.betobanco/com.xp77.os/g' "$BETO/src/main/java/com/betobanco/shared/$f.java" > "$M/$f.java"
done
# GlobalExceptionHandler sem o tratamento de AccessDeniedException (volta na Tarefa 7):
sed -e 's/com\.betobanco/com.xp77.os/g' \
    -e '/^import org\.springframework\.security\.access\.AccessDeniedException;$/d' \
    -e '/@ExceptionHandler(AccessDeniedException\.class)/,/^    }$/d' \
    "$BETO/src/main/java/com/betobanco/shared/exception/GlobalExceptionHandler.java" \
    > $M/exception/GlobalExceptionHandler.java
grep -c "AccessDenied" $M/exception/GlobalExceptionHandler.java
```

Expected do `grep -c`: `0` (nenhuma menção a `AccessDenied` sobrou). O `shared/tenant/TenantContext.java` do Beto_Banco **não** é portado: o contexto de organização nasce na Tarefa 5, com o nome `OrgContext` e sem o “raiz por padrão”.

- [ ] **Passo 4: Rodar os testes e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='ApiResponseTest,PageRequestFactoryTest,TraceIdFilterTest,GlobalExceptionHandlerTest' test`
Expected: código de saída 0, `Tests run: 26, Failures: 0, Errors: 0` (3 + 8 + 5 + 10), `BUILD SUCCESS`.

- [ ] **Passo 5: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 6: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/java/com/xp77/os/shared os/backend/src/test/java/com/xp77/os/shared
git commit -m "feat(shared): port API envelope, error handling, pagination and trace id from Beto_Banco" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 3: Fronteiras entre módulos (ArchUnit com descoberta automática)

**Arquivos:**
- Modify: `os/backend/pom.xml` (dependência de teste `archunit`)
- Create (teste): `os/backend/src/test/java/com/xp77/os/architecture/ArchitectureRules.java`
- Create (fixtures de teste): `os/backend/src/test/java/archfixtures/alpha/entity/AlphaEntity.java`, `archfixtures/alpha/repository/AlphaRepository.java`, `archfixtures/beta/service/BetaService.java`, `archfixtures/beta/controller/BadController.java`
- Test: `os/backend/src/test/java/com/xp77/os/architecture/ModuleBoundariesTest.java`, `os/backend/src/test/java/com/xp77/os/architecture/ArchitectureRulesSelfTest.java`

**Interfaces:**
- Consumes: classes de produção sob `com.xp77.os`.
- Produces: `ArchitectureRules.modulesOf(JavaClasses, String rootPackage): Set<String>`, `checkModuleBoundaries(JavaClasses, String rootPackage): void`, `noControllerAcceptsIdentity(): ArchRule`, `noControllerReturnsEntity(): ArchRule`. Toda tarefa seguinte fica sujeita às três regras (a suíte inteira roda no fim de cada tarefa).

Correções em relação ao Beto_Banco: a lista de módulos é descoberta a partir dos pacotes de primeiro nível (lá era fixa e ficou desatualizada); a regra de identidade proíbe também `orgId`/`org_id`/`organizationId`; a regra de entidade olha dentro de tipos genéricos (`ResponseEntity<Entidade>` passava despercebido); e as próprias regras são provadas contra classes de mentira que as violam (pacote `archfixtures`, fora de `com.xp77.os` para o Spring e o Hibernate nunca as enxergarem).

- [ ] **Passo 1: Adicionar o ArchUnit ao `pom.xml`**

Inserir logo antes da linha `    </dependencies>`:

```xml
        <dependency>
            <groupId>com.tngtech.archunit</groupId>
            <artifactId>archunit</artifactId>
            <version>1.3.0</version>
            <scope>test</scope>
        </dependency>
```

- [ ] **Passo 2: Escrever as fixtures e os testes (falham primeiro)**

`os/backend/src/test/java/archfixtures/alpha/entity/AlphaEntity.java`:

```java
package archfixtures.alpha.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

/** Fixture do ArchUnit: entidade do módulo "alpha". Fora de com.xp77.os de propósito. */
@Entity
public class AlphaEntity {

    @Id
    private Long id;
}
```

`os/backend/src/test/java/archfixtures/alpha/repository/AlphaRepository.java`:

```java
package archfixtures.alpha.repository;

import archfixtures.alpha.entity.AlphaEntity;

/** Fixture do ArchUnit: repositório do módulo "alpha". */
public interface AlphaRepository {

    AlphaEntity find(Long id);
}
```

`os/backend/src/test/java/archfixtures/beta/service/BetaService.java`:

```java
package archfixtures.beta.service;

import archfixtures.alpha.entity.AlphaEntity;

/** Fixture do ArchUnit: o módulo "beta" usando a entidade do "alpha" — proibido. */
public class BetaService {

    public AlphaEntity load() {
        return new AlphaEntity();
    }
}
```

`os/backend/src/test/java/archfixtures/beta/controller/BadController.java`:

```java
package archfixtures.beta.controller;

import archfixtures.alpha.entity.AlphaEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Fixture do ArchUnit: controller que viola as regras de identidade e de entidade. */
@RestController
public class BadController {

    @GetMapping("/fixture/{orgId}")
    public ResponseEntity<AlphaEntity> byOrg(@PathVariable UUID orgId) {
        return ResponseEntity.ok(new AlphaEntity());
    }

    @PostMapping("/fixture")
    public void create(@RequestBody Payload payload) {
    }

    public record Payload(UUID userId, String name) {
    }
}
```

`os/backend/src/test/java/com/xp77/os/architecture/ArchitectureRulesSelfTest.java`:

```java
package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Prova que as regras pegam violações de verdade, usando as fixtures de archfixtures. */
class ArchitectureRulesSelfTest {

    private static final String ROOT = "archfixtures";
    private static final JavaClasses FIXTURES = new ClassFileImporter().importPackages(ROOT);

    @Test
    void discoversEveryTopLevelModule() {
        assertThat(ArchitectureRules.modulesOf(FIXTURES, ROOT)).containsExactly("alpha", "beta");
    }

    @Test
    void boundaryRuleCatchesCrossModuleEntityUse() {
        assertThatThrownBy(() -> ArchitectureRules.checkModuleBoundaries(FIXTURES, ROOT))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("BetaService");
    }

    @Test
    void identityRuleCatchesOrgIdFromPath() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerAcceptsIdentity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("'orgId'");
    }

    @Test
    void identityRuleCatchesUserIdInRequestBody() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerAcceptsIdentity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("'userId'");
    }

    @Test
    void entityRuleLooksInsideGenericReturnTypes() {
        assertThatThrownBy(() -> ArchitectureRules.noControllerReturnsEntity().check(FIXTURES))
                .isInstanceOf(AssertionError.class)
                .hasMessageContaining("AlphaEntity");
    }
}
```

`os/backend/src/test/java/com/xp77/os/architecture/ModuleBoundariesTest.java`:

```java
package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** As três regras aplicadas ao código de produção. Módulo novo entra sozinho na checagem. */
class ModuleBoundariesTest {

    private static final String ROOT = "com.xp77.os";
    private static JavaClasses production;

    @BeforeAll
    static void importProductionClasses() {
        production = new ClassFileImporter()
                .withImportOption(new ImportOption.DoNotIncludeTests())
                .importPackages(ROOT);
    }

    @Test
    void modulesAreDiscoveredFromTopLevelPackages() {
        assertThat(ArchitectureRules.modulesOf(production, ROOT)).contains("shared");
    }

    @Test
    void noModuleUsesAnotherModulesEntityOrRepository() {
        ArchitectureRules.checkModuleBoundaries(production, ROOT);
    }

    @Test
    void noControllerAcceptsUserIdOrOrgIdFromTheClient() {
        ArchitectureRules.noControllerAcceptsIdentity().check(production);
    }

    @Test
    void noControllerReturnsAnEntity() {
        ArchitectureRules.noControllerReturnsEntity().check(production);
    }
}
```

- [ ] **Passo 3: Rodar e ver falhar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='ModuleBoundariesTest,ArchitectureRulesSelfTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação dos testes: `cannot find symbol ... variable ArchitectureRules`.

- [ ] **Passo 4: Escrever `ArchitectureRules`**

`os/backend/src/test/java/com/xp77/os/architecture/ArchitectureRules.java`:

```java
package com.xp77.os.architecture;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.persistence.Entity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Set;
import java.util.TreeSet;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * Regras de arquitetura, parametrizadas pelo pacote raiz para poderem ser provadas
 * contra as fixtures (archfixtures) e aplicadas ao código real (com.xp77.os).
 */
final class ArchitectureRules {

    private static final Set<String> IDENTITY_NAMES = Set.of(
            "userid", "user_id", "orgid", "org_id", "organizationid", "organization_id");

    private ArchitectureRules() {
    }

    /** Módulos = pacotes de primeiro nível abaixo da raiz. Nada de lista fixa. */
    static Set<String> modulesOf(JavaClasses classes, String rootPackage) {
        String prefix = rootPackage + ".";
        Set<String> modules = new TreeSet<>();
        for (JavaClass javaClass : classes) {
            String packageName = javaClass.getPackageName();
            if (packageName.startsWith(prefix)) {
                modules.add(packageName.substring(prefix.length()).split("\\.")[0]);
            }
        }
        return modules;
    }

    /** Regra 1: ninguém de fora de um módulo usa o entity/ ou o repository/ dele. */
    static void checkModuleBoundaries(JavaClasses classes, String rootPackage) {
        for (String module : modulesOf(classes, rootPackage)) {
            String base = rootPackage + "." + module;
            noClasses().that().resideOutsideOfPackage(base + "..")
                    .should().dependOnClassesThat()
                    .resideInAnyPackage(base + ".entity..", base + ".repository..")
                    .because("módulos só conversam pelo pacote api/ do outro módulo")
                    .allowEmptyShould(true)
                    .check(classes);
        }
    }

    /** Regra 2: identidade e organização vêm só do token, nunca de parâmetro ou corpo. */
    static ArchRule noControllerAcceptsIdentity() {
        return noClasses().that().areAnnotatedWith(RestController.class)
                .should(acceptIdentityFromClient())
                .because("identidade e organização vêm só de @AuthenticationPrincipal")
                .allowEmptyShould(true);
    }

    /** Regra 3: nenhum controller devolve @Entity, nem dentro de um tipo genérico. */
    static ArchRule noControllerReturnsEntity() {
        return noClasses().that().areAnnotatedWith(RestController.class)
                .should(returnAnEntity())
                .because("controllers devolvem DTO, nunca @Entity")
                .allowEmptyShould(true);
    }

    private static boolean isIdentity(String name) {
        return name != null
                && IDENTITY_NAMES.contains(name.toLowerCase(Locale.ROOT).replace("-", "_"));
    }

    /**
     * {@code @PathVariable UUID orgId} não declara nome na anotação: o nome real só existe
     * no bytecode (flag -parameters, ligada pelo spring-boot-starter-parent).
     */
    private static String realParameterName(JavaMethod method, int index) {
        try {
            java.lang.reflect.Parameter[] parameters = method.reflect().getParameters();
            return index < parameters.length ? parameters[index].getName() : null;
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static ArchCondition<JavaClass> acceptIdentityFromClient() {
        return new ArchCondition<>("aceitar userId ou orgId vindo do cliente") {
            @Override
            public void check(JavaClass controller, ConditionEvents events) {
                for (JavaMethod method : controller.getMethods()) {
                    method.getParameters().forEach(parameter -> {
                        String name = null;
                        if (parameter.isAnnotatedWith(PathVariable.class)) {
                            PathVariable annotation = parameter.getAnnotationOfType(PathVariable.class);
                            name = !annotation.value().isEmpty() ? annotation.value() : annotation.name();
                        } else if (parameter.isAnnotatedWith(RequestParam.class)) {
                            RequestParam annotation = parameter.getAnnotationOfType(RequestParam.class);
                            name = !annotation.value().isEmpty() ? annotation.value() : annotation.name();
                        }
                        if (name != null && name.isEmpty()) {
                            name = realParameterName(method, parameter.getIndex());
                        }
                        if (isIdentity(name)) {
                            events.add(SimpleConditionEvent.satisfied(controller,
                                    method.getFullName() + " aceita '" + name + "' do cliente"));
                        }
                        if (parameter.isAnnotatedWith(RequestBody.class)) {
                            JavaClass body = parameter.getRawType();
                            body.getAllFields().forEach(field -> {
                                if (isIdentity(field.getName())) {
                                    events.add(SimpleConditionEvent.satisfied(controller,
                                            method.getFullName() + " aceita '" + field.getName()
                                                    + "' do cliente via @RequestBody em " + body.getName()));
                                }
                            });
                        }
                    });
                }
            }
        };
    }

    private static ArchCondition<JavaClass> returnAnEntity() {
        return new ArchCondition<>("devolver @Entity") {
            @Override
            public void check(JavaClass controller, ConditionEvents events) {
                for (JavaMethod method : controller.getMethods()) {
                    // Lambdas viram métodos sintéticos "lambda$N": não são respostas de endpoint.
                    if (method.getName().startsWith("lambda$")) {
                        continue;
                    }
                    for (JavaClass involved : method.getReturnType().getAllInvolvedRawTypes()) {
                        if (involved.isAnnotatedWith(Entity.class)) {
                            events.add(SimpleConditionEvent.satisfied(controller,
                                    method.getFullName() + " devolve a entidade " + involved.getName()));
                        }
                    }
                }
            }
        };
    }
}
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='ModuleBoundariesTest,ArchitectureRulesSelfTest' test`
Expected: código de saída 0, `Tests run: 9, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 6: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 7: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src/test/java/com/xp77/os/architecture os/backend/src/test/java/archfixtures
git commit -m "test(architecture): enforce module boundaries with dynamically discovered modules" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 4: Migrações V1–V3, entidades e repositórios de `organizations` e `users`

**Arquivos:**
- Create: `os/backend/src/main/resources/db/migration/V1__extensions.sql`, `V2__organizations.sql`, `V3__users_and_memberships.sql`
- Create: `os/backend/src/main/java/com/xp77/os/organizations/entity/Organization.java`, `organizations/repository/OrganizationRepository.java`
- Create: `os/backend/src/main/java/com/xp77/os/users/api/MembershipRole.java`, `users/entity/User.java`, `users/entity/Membership.java`, `users/repository/UserRepository.java`, `users/repository/MembershipRepository.java`
- Create (apoio de teste): `os/backend/src/test/java/com/xp77/os/support/TestData.java`
- Test: `os/backend/src/test/java/com/xp77/os/organizations/OrganizationsSchemaTest.java`, `os/backend/src/test/java/com/xp77/os/users/IdentitySchemaTest.java`, `os/backend/src/test/java/com/xp77/os/EntityMappingTest.java`

**Interfaces:**
- Consumes: `PostgresTestBase.ownerJdbc()` (Tarefa 1).
- Produces:
  - Tabelas `organizations`, `users`, `memberships` (ver SQL); organização raiz com id fixo.
  - `enum MembershipRole { OWNER, ADMIN, TEAM, CLIENT }` (pacote `com.xp77.os.users.api`).
  - `Organization` (`getId(): UUID`, `getName()`, `getSlug()`, `getDomain()`, `isActive()`, `getCreatedAt()`); `OrganizationRepository extends JpaRepository<Organization, UUID>` com `Optional<Organization> findByDomainAndActiveTrue(String domain)`.
  - `User` (`User(String email, String name, String passwordHash)`, `getId()`, `getEmail()`, `getName()`, `getPasswordHash()`, `setPasswordHash(String)`, `hasPassword()`, `getStatus()`, `isActive()`, constantes `ACTIVE`/`BLOCKED`); `UserRepository` com `Optional<User> findByEmail(String)` e `boolean existsByEmail(String)`.
  - `Membership` (`Membership(UUID userId, UUID orgId, MembershipRole role)`, `getId()`, `getUserId()`, `getOrgId()`, `getRole(): MembershipRole`, `getStatus()`, `isActive()`, `block()`, `unblock()`, `recordLogin(Instant at)`, `getLastLoginAt()`, `getCreatedAt()`, constantes `ACTIVE`/`BLOCKED`); `MembershipRepository` com `Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId)`.
  - `TestData` (apoio de teste, escreve como dono): `unique(String prefix): String`, `uniqueEmail(String prefix): String`, `createOrg(String name): UUID`, `createOrg(String name, String domain, boolean active): UUID`, `createUser(String email, String passwordHash): UUID`, `addMembership(UUID userId, UUID orgId, String role): UUID`.

Nesta tarefa o papel `app_77xp` ainda não tem permissão nas tabelas (isso é a V4, Tarefa 5). Por isso os testes de esquema usam `ownerJdbc()`, e os repositórios são conferidos só na subida do contexto: o Hibernate valida o mapeamento contra o banco (`ddl-auto: validate`) e o Spring Data valida os nomes dos métodos derivados.

- [ ] **Passo 1: Escrever o apoio de dados e os testes de esquema (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/support/TestData.java`:

```java
package com.xp77.os.support;

import java.util.UUID;

/**
 * Cria dados de teste direto no banco, como o dono (ignora RLS e permissões).
 * Valores únicos por chamada: todas as classes de teste dividem o mesmo banco.
 */
public final class TestData {

    private TestData() {
    }

    public static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    public static String uniqueEmail(String prefix) {
        return unique(prefix) + "@teste.77xp.dev";
    }

    public static UUID createOrg(String name) {
        return createOrg(name, null, true);
    }

    public static UUID createOrg(String name, String domain, boolean active) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into organizations (name, slug, domain, active) values (?, ?, ?, ?) returning id",
                UUID.class, name, unique("org"), domain, active);
    }

    public static UUID createUser(String email, String passwordHash) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into users (email, password_hash) values (?, ?) returning id",
                UUID.class, email, passwordHash);
    }

    public static UUID addMembership(UUID userId, UUID orgId, String role) {
        return PostgresTestBase.ownerJdbc().queryForObject(
                "insert into memberships (user_id, org_id, role) values (?, ?, ?) returning id",
                UUID.class, userId, orgId, role);
    }
}
```

`os/backend/src/test/java/com/xp77/os/organizations/OrganizationsSchemaTest.java`:

```java
package com.xp77.os.organizations;

import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrganizationsSchemaTest extends PostgresTestBase {

    @Test
    void pgcryptoIsInstalled() {
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_extension where extname = 'pgcrypto'", Long.class)).isEqualTo(1L);
    }

    @Test
    void rootOrganizationExistsWithFixedId() {
        Map<String, Object> root = ownerJdbc().queryForMap(
                "select name, slug, domain, active from organizations where id = ?",
                UUID.fromString("00000000-0000-4000-8000-000000000001"));

        assertThat(root).containsEntry("name", "77xp").containsEntry("slug", "77xp")
                .containsEntry("active", true);
        assertThat(root.get("domain")).isNull();
    }

    @Test
    void slugIsUnique() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into organizations (name, slug) values ('Outra', '77xp')"))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void domainIsUniqueAndLowercase() {
        String domain = TestData.unique("dominio") + ".exemplo.com";
        TestData.createOrg("Primeira", domain, true);

        assertThatThrownBy(() -> TestData.createOrg("Segunda", domain, true))
                .isInstanceOf(DuplicateKeyException.class);
        assertThatThrownBy(() -> TestData.createOrg("Maiúsculas", "Cliente.Exemplo.com", true))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void slugMustBeLowercaseKebabCase() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into organizations (name, slug) values ('Ruim', 'Com Espaço')"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void themeDefaultsToEmptyObjectAndOrganizationStartsActive() {
        UUID id = TestData.createOrg("Padrões");

        Map<String, Object> row = ownerJdbc().queryForMap(
                "select theme::text as theme, active from organizations where id = ?", id);
        assertThat(row).containsEntry("theme", "{}").containsEntry("active", true);
    }
}
```

`os/backend/src/test/java/com/xp77/os/users/IdentitySchemaTest.java`:

```java
package com.xp77.os.users;

import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentitySchemaTest extends PostgresTestBase {

    @Test
    void emailIsTrimmedAndLowercasedOnWrite() {
        String local = TestData.unique("Alguem");
        UUID id = TestData.createUser("  " + local + "@Exemplo.COM ", null);

        assertThat(ownerJdbc().queryForObject("select email from users where id = ?", String.class, id))
                .isEqualTo(local.toLowerCase() + "@exemplo.com");
    }

    @Test
    void emailIsUniqueRegardlessOfCase() {
        String email = TestData.uniqueEmail("dup");
        TestData.createUser(email, null);

        assertThatThrownBy(() -> TestData.createUser(email.toUpperCase(), null))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void statusOnlyAcceptsActiveOrBlocked() {
        assertThatThrownBy(() -> ownerJdbc().update(
                "insert into users (email, status) values (?, 'DELETED')", TestData.uniqueEmail("status")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void membershipIsUniquePerUserAndOrganization() {
        UUID org = TestData.createOrg("Única");
        UUID user = TestData.createUser(TestData.uniqueEmail("membro"), null);
        TestData.addMembership(user, org, "TEAM");

        assertThatThrownBy(() -> TestData.addMembership(user, org, "ADMIN"))
                .isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void membershipRoleAcceptsTheFourAccountTypesAndNothingElse() {
        UUID org = TestData.createOrg("Papéis");
        for (String role : new String[] {"OWNER", "ADMIN", "TEAM", "CLIENT"}) {
            TestData.addMembership(TestData.createUser(TestData.uniqueEmail(role.toLowerCase()), null), org, role);
        }
        UUID user = TestData.createUser(TestData.uniqueEmail("papel"), null);

        assertThatThrownBy(() -> TestData.addMembership(user, org, "SUPERADMIN"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void membershipStartsActiveWithoutLastLoginAndStatusIsChecked() {
        UUID org = TestData.createOrg("Situação");
        UUID membership = TestData.addMembership(TestData.createUser(TestData.uniqueEmail("situacao"), null), org, "TEAM");

        assertThat(ownerJdbc().queryForMap("select status, last_login_at from memberships where id = ?", membership))
                .containsEntry("status", "ACTIVE").containsEntry("last_login_at", null);
        assertThatThrownBy(() -> ownerJdbc().update("update memberships set status = 'DELETED' where id = ?", membership))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void nameIsOptional() {
        UUID id = TestData.createUser(TestData.uniqueEmail("sem-nome"), null);
        ownerJdbc().update("update users set name = 'Maria Souza' where id = ?", id);

        assertThat(ownerJdbc().queryForObject("select name from users where id = ?", String.class, id))
                .isEqualTo("Maria Souza");
    }

    @Test
    void userMayBelongToSeveralOrganizations() {
        UUID user = TestData.createUser(TestData.uniqueEmail("varias"), null);
        TestData.addMembership(user, TestData.createOrg("Uma"), "OWNER");
        TestData.addMembership(user, TestData.createOrg("Outra"), "TEAM");

        assertThat(ownerJdbc().queryForObject(
                "select count(*) from memberships where user_id = ?", Long.class, user)).isEqualTo(2L);
    }
}
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrganizationsSchemaTest,IdentitySchemaTest' test`
Expected: código de saída 1, `BUILD FAILURE`, `Tests run: 14, Failures: …, Errors: …` com `relation "organizations" does not exist` / `relation "users" does not exist` e `pgcrypto` ausente.

- [ ] **Passo 3: Escrever as migrações V1, V2 e V3**

`os/backend/src/main/resources/db/migration/V1__extensions.sql`:

```sql
-- V1: extensões.
--
-- gen_random_uuid() é nativa do PostgreSQL 13+ (fica em pg_catalog) e não
-- depende de extensão. A pgcrypto entra para digest()/hmac() em SQL.
--
-- No Supabase as extensões já vêm instaladas no schema "extensions"; num
-- PostgreSQL limpo (containers e testes) o IF NOT EXISTS instala no schema
-- padrão. Por isso toda função nossa que chamar algo de extensão declara
-- SET search_path = public, extensions, pg_catalog (padrão do Beto_Banco, V16)
-- e funciona nos dois lugares.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

`os/backend/src/main/resources/db/migration/V2__organizations.sql`:

```sql
-- V2: organizações, a base do white-label. Tabela global (sem RLS): o acesso
-- passa só pelo módulo organizations.
CREATE TABLE organizations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    slug       TEXT NOT NULL,
    domain     TEXT,
    theme      JSONB NOT NULL DEFAULT '{}'::jsonb,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT organizations_slug_unique UNIQUE (slug),
    CONSTRAINT organizations_domain_unique UNIQUE (domain),
    CONSTRAINT organizations_slug_format_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT organizations_domain_lowercase_check CHECK (domain = lower(domain))
);

-- Organização raiz com id fixo: o código a referencia por constante
-- (RootOrganization.ID), sem uma consulta a mais por requisição.
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000001', '77xp', '77xp');
```

`os/backend/src/main/resources/db/migration/V3__users_and_memberships.sql`:

```sql
-- V3: identidade global e vínculo com organizações.
--
-- users é global (a mesma pessoa pode estar em várias organizações) e não tem RLS.
-- O papel da pessoa em cada organização vive só em memberships.role, no servidor,
-- junto com a situação do vínculo (o bloqueio vale para a organização) e o último acesso.
-- Contas só nascem por convite ou pelo comando de inicialização (D10).

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL,
    name          TEXT,
    -- Vazio até a pessoa criar a senha pelo link de primeiro acesso.
    password_hash TEXT,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'BLOCKED')),
    CONSTRAINT users_email_lowercase_check CHECK (email = lower(email))
);

-- E-mail sempre minúsculo e sem espaços: "Fulano@x.com" e "fulano@x.com " não
-- podem virar duas contas. search_path fixo (lição da V22 do Beto_Banco).
CREATE FUNCTION users_normalize_email() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.email := lower(trim(NEW.email));
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_normalize_email_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION users_normalize_email();

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE memberships (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    org_id        UUID NOT NULL REFERENCES organizations (id),
    role          TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT memberships_role_check CHECK (role IN ('OWNER', 'ADMIN', 'TEAM', 'CLIENT')),
    CONSTRAINT memberships_status_check CHECK (status IN ('ACTIVE', 'BLOCKED')),
    CONSTRAINT memberships_user_org_unique UNIQUE (user_id, org_id)
);

CREATE INDEX memberships_org_id_idx ON memberships (org_id);
```

- [ ] **Passo 4: Rodar os testes de esquema e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrganizationsSchemaTest,IdentitySchemaTest' test`
Expected: código de saída 0, `Tests run: 14, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Escrever o teste de mapeamento (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/EntityMappingTest.java`:

```java
package com.xp77.os;

import com.xp77.os.organizations.entity.Organization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.entity.User;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.EntityType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * O contexto só sobe se o Hibernate validar cada entidade contra o banco
 * (ddl-auto: validate); este teste garante que as entidades estão no mapeamento.
 */
class EntityMappingTest extends PostgresTestBase {

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @Test
    void foundationEntitiesAreMappedAndValidatedAgainstTheSchema() {
        assertThat(entityManagerFactory.getMetamodel().getEntities())
                .extracting(EntityType::getJavaType)
                .contains(Organization.class, User.class, Membership.class);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=EntityMappingTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.organizations.entity does not exist`.

- [ ] **Passo 6: Escrever entidades, enum e repositórios**

`os/backend/src/main/java/com/xp77/os/users/api/MembershipRole.java`:

```java
package com.xp77.os.users.api;

/**
 * Tipo de conta de uma pessoa numa organização. Existe só no servidor (memberships.role).
 * OWNER, ADMIN e TEAM usam o painel; CLIENT usa só a Área do cliente.
 */
public enum MembershipRole {
    OWNER,
    ADMIN,
    TEAM,
    CLIENT
}
```

`os/backend/src/main/java/com/xp77/os/organizations/entity/Organization.java`:

```java
package com.xp77.os.organizations.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Organização (base do white-label). A coluna theme (jsonb) ainda não é mapeada:
 * nenhum código da Fundação a lê; entra na etapa 7.
 */
@Entity
@Table(name = "organizations")
public class Organization {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    private String domain;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected Organization() {
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getSlug() {
        return slug;
    }

    public String getDomain() {
        return domain;
    }

    public boolean isActive() {
        return active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
```

`os/backend/src/main/java/com/xp77/os/organizations/repository/OrganizationRepository.java`:

```java
package com.xp77.os.organizations.repository;

import com.xp77.os.organizations.entity.Organization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByDomainAndActiveTrue(String domain);
}
```

`os/backend/src/main/java/com/xp77/os/users/entity/User.java`:

```java
package com.xp77.os.users.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    public static final String ACTIVE = "ACTIVE";
    public static final String BLOCKED = "BLOCKED";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String email;

    private String name;

    /** Nulo até a pessoa definir a senha pelo link de primeiro acesso. */
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(nullable = false)
    private String status = ACTIVE;

    // O trigger da V3 mantém updated_at e o DEFAULT cuida de created_at: o
    // Hibernate não escreve nessas colunas para não haver duas fontes de verdade.
    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    protected User() {
    }

    public User(String email, String name, String passwordHash) {
        this.email = email;
        this.name = name;
        this.passwordHash = passwordHash;
    }

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getName() {
        return name;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public boolean hasPassword() {
        return passwordHash != null;
    }

    public String getStatus() {
        return status;
    }

    public boolean isActive() {
        return ACTIVE.equals(status);
    }
}
```

`os/backend/src/main/java/com/xp77/os/users/entity/Membership.java`:

```java
package com.xp77.os.users.entity;

import com.xp77.os.users.api.MembershipRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/**
 * Vínculo pessoa × organização: tipo de conta, situação e último acesso.
 * O bloqueio vale para a organização (o vínculo), não para a pessoa no sistema todo.
 * Tabela com RLS por organização a partir da V4.
 */
@Entity
@Table(name = "memberships")
public class Membership {

    public static final String ACTIVE = "ACTIVE";
    public static final String BLOCKED = "BLOCKED";

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MembershipRole role;

    @Column(nullable = false)
    private String status = ACTIVE;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected Membership() {
    }

    public Membership(UUID userId, UUID orgId, MembershipRole role) {
        this.userId = userId;
        this.orgId = orgId;
        this.role = role;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public MembershipRole getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public boolean isActive() {
        return ACTIVE.equals(status);
    }

    public void block() {
        this.status = BLOCKED;
    }

    public void unblock() {
        this.status = ACTIVE;
    }

    public void recordLogin(Instant at) {
        this.lastLoginAt = at;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
```

`os/backend/src/main/java/com/xp77/os/users/repository/UserRepository.java`:

```java
package com.xp77.os.users.repository;

import com.xp77.os.users.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/** Recebe o e-mail já normalizado (minúsculo, sem espaços) pelo serviço. */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
```

`os/backend/src/main/java/com/xp77/os/users/repository/MembershipRepository.java`:

```java
package com.xp77.os.users.repository;

import com.xp77.os.users.entity.Membership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId);
}
```

- [ ] **Passo 7: Rodar o teste de mapeamento e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=EntityMappingTest test`
Expected: código de saída 0, `Tests run: 1, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 8: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS` (o `ModuleBoundariesTest` agora cobre também `organizations` e `users`).

- [ ] **Passo 9: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources/db/migration os/backend/src/main/java/com/xp77/os/organizations os/backend/src/main/java/com/xp77/os/users os/backend/src/test/java/com/xp77/os/support/TestData.java os/backend/src/test/java/com/xp77/os/organizations os/backend/src/test/java/com/xp77/os/users os/backend/src/test/java/com/xp77/os/EntityMappingTest.java
git commit -m "feat(db): add organizations, users and memberships schema with JPA mappings" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 5: V4, contexto de organização, transação que informa `app.org_id` e prova de isolamento

**Arquivos:**
- Create: `os/backend/src/main/resources/db/migration/V4__app_role_and_rls.sql`
- Create: `os/backend/src/main/java/com/xp77/os/organizations/api/OrgContext.java`, `organizations/api/OrgResolver.java`, `organizations/api/RootOrganization.java`, `organizations/service/DomainOrgResolver.java`
- Create: `os/backend/src/main/java/com/xp77/os/config/OrgAwareJpaTransactionManager.java`, `config/TransactionConfig.java`
- Test: `os/backend/src/test/java/com/xp77/os/organizations/OrgContextTest.java`, `organizations/OrgResolverTest.java`, `os/backend/src/test/java/com/xp77/os/config/AppRoleSchemaTest.java`, `config/OrgAwareTransactionManagerTest.java`, `os/backend/src/test/java/com/xp77/os/users/MembershipIsolationTest.java`

**Interfaces:**
- Consumes: tabelas e repositórios da Tarefa 4; `TestData`; `PostgresTestBase.ownerJdbc()`.
- Produces:
  - `final class OrgContext` — `static Optional<UUID> current()`, `static void set(UUID orgId)`, `static void clear()`, `static <T> T callAs(UUID orgId, Supplier<T> action)` (lança `IllegalStateException` se chamado com transação aberta), `static void runAs(UUID orgId, Runnable action)`.
  - `interface OrgResolver` — `UUID resolve(String host)` (domínio de organização ativa, senão a raiz); implementação `DomainOrgResolver` (`@Service`).
  - `final class RootOrganization` — `static final UUID ID = 00000000-0000-4000-8000-000000000001`, `static final String SLUG = "77xp"`.
  - `class OrgAwareJpaTransactionManager extends JpaTransactionManager` registrado como bean `transactionManager` por `TransactionConfig`.
  - Papel `app_77xp` com `SELECT, INSERT, UPDATE, DELETE` em todas as tabelas atuais e futuras do schema `public` (menos `flyway_schema_history`); RLS forçado em `memberships`.

Regra de uso (vale para todas as tarefas seguintes): a organização precisa estar no `OrgContext` **antes** de a transação começar. Teste com banco nunca usa `@Transactional` na classe/método; usa `OrgContext.callAs(...)` e, quando precisa de transação explícita, `TransactionTemplate` dentro dele.

- [ ] **Passo 1: Escrever os testes do contexto e do esquema (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/organizations/OrgContextTest.java`:

```java
package com.xp77.os.organizations;

import com.xp77.os.organizations.api.OrgContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgContextTest {

    @AfterEach
    void clean() {
        OrgContext.clear();
    }

    @Test
    void isEmptyUntilSomeoneSetsIt() {
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void setAndClear() {
        UUID org = UUID.randomUUID();
        OrgContext.set(org);
        assertThat(OrgContext.current()).contains(org);

        OrgContext.clear();
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void callAsRestoresThePreviousOrganization() {
        UUID outer = UUID.randomUUID();
        UUID inner = UUID.randomUUID();
        OrgContext.set(outer);

        UUID seen = OrgContext.callAs(inner, () -> OrgContext.current().orElseThrow());

        assertThat(seen).isEqualTo(inner);
        assertThat(OrgContext.current()).contains(outer);
    }

    @Test
    void callAsCleansUpEvenWhenTheActionFails() {
        assertThatThrownBy(() -> OrgContext.runAs(UUID.randomUUID(), () -> {
            throw new IllegalArgumentException("falhou");
        })).isInstanceOf(IllegalArgumentException.class);

        assertThat(OrgContext.current()).isEmpty();
    }
}
```

`os/backend/src/test/java/com/xp77/os/config/AppRoleSchemaTest.java`:

```java
package com.xp77.os.config;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** V4: o papel da aplicação não escapa do RLS e não é dono de nada. */
class AppRoleSchemaTest extends PostgresTestBase {

    private boolean appRoleHas(String table, String privilege) {
        return ownerJdbc().queryForObject("select has_table_privilege('app_77xp', ?, ?)",
                Boolean.class, "public." + table, privilege);
    }

    @Test
    void appRoleLogsInButCannotBypassRowLevelSecurity() {
        Map<String, Object> role = ownerJdbc().queryForMap(
                "select rolsuper, rolbypassrls, rolcanlogin from pg_roles where rolname = 'app_77xp'");

        assertThat(role).containsEntry("rolsuper", false)
                .containsEntry("rolbypassrls", false)
                .containsEntry("rolcanlogin", true);
    }

    @Test
    void appRoleOwnsNoTable() {
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_tables where schemaname = 'public' and tableowner = 'app_77xp'",
                Long.class)).isZero();
    }

    @Test
    void membershipsHasForcedRowLevelSecurityWithOnePolicy() {
        Map<String, Object> flags = ownerJdbc().queryForMap(
                "select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.memberships'::regclass");

        assertThat(flags).containsEntry("relrowsecurity", true).containsEntry("relforcerowsecurity", true);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from pg_policies where tablename = 'memberships'", Long.class)).isEqualTo(1L);
    }

    @Test
    void globalTablesHaveNoRowLevelSecurity() {
        assertThat(ownerJdbc().queryForList(
                "select relname from pg_class where relname in ('users', 'organizations') and relrowsecurity",
                String.class)).isEmpty();
    }

    @Test
    void appRoleCanReadAndWriteApplicationTables() {
        for (String table : List.of("organizations", "users", "memberships")) {
            for (String privilege : List.of("SELECT", "INSERT", "UPDATE", "DELETE")) {
                assertThat(appRoleHas(table, privilege)).as(privilege + " em " + table).isTrue();
            }
        }
    }

    @Test
    void appRoleCannotTouchFlywayHistory() {
        for (String privilege : List.of("SELECT", "INSERT", "UPDATE", "DELETE")) {
            assertThat(appRoleHas("flyway_schema_history", privilege)).as(privilege).isFalse();
        }
    }

    @Test
    void tablesCreatedByLaterMigrationsAreGrantedAutomatically() {
        String table = "zz_probe_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        ownerJdbc().execute("create table " + table + " (id int)");
        try {
            assertThat(appRoleHas(table, "INSERT")).isTrue();
        } finally {
            ownerJdbc().execute("drop table " + table);
        }
    }
}
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrgContextTest,AppRoleSchemaTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.organizations.api does not exist`.

- [ ] **Passo 3: Escrever `OrgContext` e a migração V4**

`os/backend/src/main/java/com/xp77/os/organizations/api/OrgContext.java`:

```java
package com.xp77.os.organizations.api;

import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Organização da requisição (ou do processo) corrente.
 *
 * <p>Quem preenche: o OrgContextFilter em toda requisição (claim org do token ou,
 * em rota pública, o domínio) e {@link #callAs} em processos sem requisição.
 * Quem lê: o OrgAwareJpaTransactionManager, que informa app.org_id ao banco no
 * INÍCIO de cada transação. Trocar a organização com uma transação aberta não
 * teria efeito, então {@link #callAs} recusa em vez de falhar calado.
 *
 * <p>Diferente do TenantContext do Beto_Banco, não existe "raiz por padrão":
 * sem organização definida, o banco não mostra nada.
 */
public final class OrgContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private OrgContext() {
    }

    public static Optional<UUID> current() {
        return Optional.ofNullable(CURRENT.get());
    }

    public static void set(UUID orgId) {
        CURRENT.set(Objects.requireNonNull(orgId, "orgId"));
    }

    /** Obrigatório no fim de toda requisição: a thread volta para o pool. */
    public static void clear() {
        CURRENT.remove();
    }

    public static <T> T callAs(UUID orgId, Supplier<T> action) {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException(
                    "OrgContext.callAs dentro de uma transação não muda app.org_id; chame fora dela.");
        }
        UUID previous = CURRENT.get();
        set(orgId);
        try {
            return action.get();
        } finally {
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }

    public static void runAs(UUID orgId, Runnable action) {
        callAs(orgId, () -> {
            action.run();
            return null;
        });
    }
}
```

`os/backend/src/main/resources/db/migration/V4__app_role_and_rls.sql`:

```sql
-- V4: papel da aplicação, permissões padrão e RLS por organização.
--
-- Vem antes das demais tabelas para cada tabela nova já nascer com as permissões
-- certas. A aplicação conecta como app_77xp: sem BYPASSRLS e sem ser dona de
-- nada, então o RLS vale para ela. As migrações rodam como o dono.
--
-- A senha NUNCA fica aqui. O papel é criado antes do Flyway: nos testes pelo
-- script do Testcontainers, no local pelo init do docker compose e no Supabase
-- pelo passo a passo de publicação. Este bloco só garante que ele exista.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_77xp') THEN
        CREATE ROLE app_77xp LOGIN NOBYPASSRLS;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_77xp;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_77xp;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_77xp;

-- Tabelas e sequências criadas depois (pelo mesmo dono, nas próximas migrações).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_77xp;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_77xp;

-- O histórico do Flyway é só do dono: a aplicação não lê nem escreve nele.
REVOKE ALL ON TABLE flyway_schema_history FROM app_77xp;

-- RLS por organização. Sem organização informada, nada aparece e nada é gravado.
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

CREATE POLICY memberships_org_isolation ON memberships
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrgContextTest,AppRoleSchemaTest' test`
Expected: código de saída 0, `Tests run: 11, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Escrever os testes da transação e do isolamento (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/config/OrgAwareTransactionManagerTest.java`:

```java
package com.xp77.os.config;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgAwareTransactionManagerTest extends PostgresTestBase {

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    private String orgSeenByDatabase(boolean readOnly) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.setReadOnly(readOnly);
        return tx.execute(status ->
                jdbc.queryForObject("select current_setting('app.org_id', true)", String.class));
    }

    @Test
    void applicationUsesTheOrgAwareTransactionManager() {
        assertThat(transactionManager).isInstanceOf(OrgAwareJpaTransactionManager.class);
    }

    @Test
    void everyTransactionTellsTheDatabaseTheCurrentOrganization() {
        UUID org = UUID.randomUUID();

        assertThat(OrgContext.callAs(org, () -> orgSeenByDatabase(false))).isEqualTo(org.toString());
    }

    @Test
    void readOnlyTransactionsAlsoReceiveTheOrganization() {
        UUID org = UUID.randomUUID();

        assertThat(OrgContext.callAs(org, () -> orgSeenByDatabase(true))).isEqualTo(org.toString());
    }

    @Test
    void withoutOrganizationTheSettingIsEmpty() {
        assertThat(orgSeenByDatabase(false)).isEmpty();
    }

    @Test
    void callAsInsideAnOpenTransactionIsRejected() {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> tx.executeWithoutResult(status ->
                OrgContext.callAs(UUID.randomUUID(), () -> 1)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("dentro de uma transação");
    }
}
```

`os/backend/src/test/java/com/xp77/os/users/MembershipIsolationTest.java`:

```java
package com.xp77.os.users;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.repository.MembershipRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * A prova do RLS: com a organização A no contexto, nada da organização B é lido,
 * alterado ou apagado — nem por repositório, nem por SQL direto — e nada é gravado em B.
 * A aplicação conecta como app_77xp; o preparo usa o dono (ownerJdbc).
 */
class MembershipIsolationTest extends PostgresTestBase {

    @Autowired
    private MembershipRepository memberships;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    private UUID orgA;
    private UUID orgB;
    private UUID userA;
    private UUID membershipA;
    private UUID membershipB;

    @BeforeEach
    void twoOrganizationsWithData() {
        OrgContext.clear();
        orgA = TestData.createOrg("Org A");
        orgB = TestData.createOrg("Org B");
        userA = TestData.createUser(TestData.uniqueEmail("a"), null);
        UUID userB = TestData.createUser(TestData.uniqueEmail("b"), null);
        membershipA = TestData.addMembership(userA, orgA, "OWNER");
        membershipB = TestData.addMembership(userB, orgB, "OWNER");
    }

    private <T> T inTransaction(TransactionCallback<T> action) {
        return new TransactionTemplate(transactionManager).execute(action);
    }

    @Test
    void repositoryReadsOnlyTheCurrentOrganization() {
        List<Membership> seen = OrgContext.callAs(orgA, () -> memberships.findAll());

        assertThat(seen).extracting(Membership::getOrgId).containsOnly(orgA);
        assertThat(seen).extracting(Membership::getId).contains(membershipA).doesNotContain(membershipB);
        assertThat(OrgContext.callAs(orgA, () -> memberships.findById(membershipB))).isEmpty();
    }

    @Test
    void nativeQueryReadsOnlyTheCurrentOrganization() {
        Long fromB = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.queryForObject(
                "select count(*) from memberships where org_id = ?", Long.class, orgB)));
        Long fromA = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.queryForObject(
                "select count(*) from memberships where org_id = ?", Long.class, orgA)));

        assertThat(fromB).isZero();
        assertThat(fromA).isEqualTo(1L);
    }

    @Test
    void cannotUpdateAnotherOrganizationsRow() {
        Integer updated = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.update(
                "update memberships set role = 'TEAM' where id = ?", membershipB)));

        assertThat(updated).isZero();
        assertThat(ownerJdbc().queryForObject(
                "select role from memberships where id = ?", String.class, membershipB)).isEqualTo("OWNER");
    }

    @Test
    void cannotDeleteAnotherOrganizationsRow() {
        OrgContext.runAs(orgA, () -> memberships.deleteById(membershipB));
        Integer deleted = OrgContext.callAs(orgA, () -> inTransaction(status -> jdbc.update(
                "delete from memberships where id = ?", membershipB)));

        assertThat(deleted).isZero();
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from memberships where id = ?", Long.class, membershipB)).isEqualTo(1L);
    }

    @Test
    void cannotInsertARowForAnotherOrganization() {
        assertThatThrownBy(() -> OrgContext.runAs(orgA, () ->
                memberships.saveAndFlush(new Membership(userA, orgB, MembershipRole.TEAM))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("row-level security");
    }

    @Test
    void withoutOrganizationNothingIsVisible() {
        assertThat(memberships.findAll()).isEmpty();
        assertThat(inTransaction(status ->
                jdbc.queryForObject("select count(*) from memberships", Long.class))).isZero();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrgAwareTransactionManagerTest,MembershipIsolationTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class OrgAwareJpaTransactionManager`.

- [ ] **Passo 6: Escrever o gerenciador de transação**

`os/backend/src/main/java/com/xp77/os/config/OrgAwareJpaTransactionManager.java`:

```java
package com.xp77.os.config;

import com.xp77.os.organizations.api.OrgContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.EntityTransaction;
import org.hibernate.Session;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.sql.PreparedStatement;
import java.util.UUID;

/**
 * A metade do RLS que faltava no Beto_Banco: no início de CADA transação informa
 * ao banco a organização corrente (OrgContext), com set_config(..., true) — o valor
 * vale só até o fim da transação e nunca vaza para a próxima que usar a conexão.
 * Sem organização, informa texto vazio, e as políticas não mostram nada.
 */
public class OrgAwareJpaTransactionManager extends JpaTransactionManager {

    static final String SET_ORG_SQL = "select set_config('app.org_id', ?, true)";

    public OrgAwareJpaTransactionManager(EntityManagerFactory entityManagerFactory) {
        super(entityManagerFactory);
    }

    @Override
    protected void doBegin(Object transaction, TransactionDefinition definition) {
        super.doBegin(transaction, definition);
        String orgId = OrgContext.current().map(UUID::toString).orElse("");
        EntityManagerHolder holder = (EntityManagerHolder)
                TransactionSynchronizationManager.getResource(obtainEntityManagerFactory());
        EntityManager entityManager = holder.getEntityManager();
        try {
            entityManager.unwrap(Session.class).doWork(connection -> {
                try (PreparedStatement statement = connection.prepareStatement(SET_ORG_SQL)) {
                    statement.setString(1, orgId);
                    statement.execute();
                }
            });
        } catch (RuntimeException ex) {
            // Não deixa uma transação meio aberta presa à thread nem a conexão fora do pool.
            EntityTransaction open = entityManager.getTransaction();
            if (open.isActive()) {
                open.rollback();
            }
            doCleanupAfterCompletion(transaction);
            throw new CannotCreateTransactionException(
                    "Não foi possível informar a organização ao banco", ex);
        }
    }
}
```

`os/backend/src/main/java/com/xp77/os/config/TransactionConfig.java`:

```java
package com.xp77.os.config;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;

/** Substitui o JpaTransactionManager padrão do Spring Boot (que recua ao ver este bean). */
@Configuration(proxyBeanMethods = false)
public class TransactionConfig {

    @Bean
    public PlatformTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
        return new OrgAwareJpaTransactionManager(entityManagerFactory);
    }
}
```

- [ ] **Passo 7: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OrgAwareTransactionManagerTest,MembershipIsolationTest' test`
Expected: código de saída 0, `Tests run: 11, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 8: Escrever o teste do resolvedor por domínio (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/organizations/OrgResolverTest.java`:

```java
package com.xp77.os.organizations;

import com.xp77.os.organizations.api.OrgResolver;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OrgResolverTest extends PostgresTestBase {

    @Autowired
    private OrgResolver resolver;

    @Test
    void unknownHostFallsBackToTheRootOrganization() {
        assertThat(resolver.resolve("nao-cadastrado.exemplo.com")).isEqualTo(RootOrganization.ID);
    }

    @Test
    void missingHostFallsBackToTheRootOrganization() {
        assertThat(resolver.resolve(null)).isEqualTo(RootOrganization.ID);
        assertThat(resolver.resolve("  ")).isEqualTo(RootOrganization.ID);
    }

    @Test
    void registeredDomainResolvesToItsOrganizationIgnoringCase() {
        String domain = TestData.unique("cliente") + ".exemplo.com";
        UUID org = TestData.createOrg("Cliente", domain, true);

        assertThat(resolver.resolve(domain.toUpperCase())).isEqualTo(org);
    }

    @Test
    void inactiveOrganizationDomainFallsBackToTheRoot() {
        String domain = TestData.unique("inativa") + ".exemplo.com";
        TestData.createOrg("Inativa", domain, false);

        assertThat(resolver.resolve(domain)).isEqualTo(RootOrganization.ID);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=OrgResolverTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class OrgResolver`.

- [ ] **Passo 9: Escrever `RootOrganization`, `OrgResolver` e `DomainOrgResolver`**

`os/backend/src/main/java/com/xp77/os/organizations/api/RootOrganization.java`:

```java
package com.xp77.os.organizations.api;

import java.util.UUID;

/** A organização 77xp, criada na V2 com id fixo. */
public final class RootOrganization {

    public static final UUID ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    public static final String SLUG = "77xp";

    private RootOrganization() {
    }
}
```

`os/backend/src/main/java/com/xp77/os/organizations/api/OrgResolver.java`:

```java
package com.xp77.os.organizations.api;

import java.util.UUID;

/** Descobre a organização de uma rota pública pelo domínio da requisição. */
public interface OrgResolver {

    /** Organização ativa cujo domínio é o host informado; sem cadastro, a raiz (77xp). */
    UUID resolve(String host);
}
```

`os/backend/src/main/java/com/xp77/os/organizations/service/DomainOrgResolver.java`:

```java
package com.xp77.os.organizations.service;

import com.xp77.os.organizations.api.OrgResolver;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.organizations.entity.Organization;
import com.xp77.os.organizations.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class DomainOrgResolver implements OrgResolver {

    private final OrganizationRepository organizations;

    public DomainOrgResolver(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    @Transactional(readOnly = true)
    public UUID resolve(String host) {
        if (host == null || host.isBlank()) {
            return RootOrganization.ID;
        }
        String domain = host.trim().toLowerCase(Locale.ROOT);
        return organizations.findByDomainAndActiveTrue(domain)
                .map(Organization::getId)
                .orElse(RootOrganization.ID);
    }
}
```

- [ ] **Passo 10: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=OrgResolverTest test`
Expected: código de saída 0, `Tests run: 4, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 11: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 12: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources/db/migration/V4__app_role_and_rls.sql os/backend/src/main/java/com/xp77/os/organizations os/backend/src/main/java/com/xp77/os/config os/backend/src/test/java/com/xp77/os/organizations os/backend/src/test/java/com/xp77/os/config os/backend/src/test/java/com/xp77/os/users/MembershipIsolationTest.java
git commit -m "feat(organizations): enforce per-organization RLS through an org-aware transaction manager" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 6: Serviços de `users` (pessoas e vínculos) e codificador de senha

**Arquivos:**
- Modify: `os/backend/pom.xml` (`spring-security-crypto` e `bcprov-jdk18on` — só a parte de criptografia; o Spring Security web entra na Tarefa 7)
- Create: `os/backend/src/main/java/com/xp77/os/config/PasswordEncoderConfig.java`
- Create: `os/backend/src/main/java/com/xp77/os/users/api/UserAccount.java`, `users/api/UserDirectory.java`, `users/api/MemberSummary.java`, `users/api/MembershipDirectory.java`, `users/service/UserDirectoryService.java`, `users/service/MembershipDirectoryService.java`
- Modify: `os/backend/src/main/java/com/xp77/os/users/repository/MembershipRepository.java` (consultas com os dados da pessoa)
- Modify: `os/backend/src/test/java/com/xp77/os/support/TestData.java` (método `hash`)
- Test: `os/backend/src/test/java/com/xp77/os/config/PasswordEncoderConfigTest.java`, `os/backend/src/test/java/com/xp77/os/users/UserDirectoryServiceTest.java`, `users/MembershipDirectoryServiceTest.java`

**Interfaces:**
- Consumes: `User`, `UserRepository`, `Membership`, `MembershipRepository`, `MembershipRole` (Tarefa 4); `OrgContext` (Tarefa 5); `BusinessException`, `ErrorCode`, `NotFoundException` (Tarefa 2).
- Produces:
  - `PasswordEncoderConfig` — bean `PasswordEncoder passwordEncoder()` (`DelegatingPasswordEncoder`, padrão `{argon2}`, aceita `{bcrypt}`); constantes `CURRENT_ID = "argon2"`, `CURRENT_PREFIX = "{argon2}"`.
  - `record UserAccount(UUID id, String email, String name, boolean hasPassword)`.
  - `interface UserDirectory` — `Optional<UserAccount> findActiveById(UUID id)`, `Optional<UserAccount> findActiveByEmail(String email)`, `Optional<UserAccount> findByEmail(String email)`, `Optional<UserAccount> verifyCredentials(String email, String password)`, `UserAccount createWithoutPassword(String email, String name)` (lança `BusinessException(CONFLICT, "E-mail já cadastrado")`), `void setPassword(UUID userId, String newPassword)` (lança `NotFoundException("Usuário não encontrado")`).
  - `record MemberSummary(UUID userId, String email, String name, MembershipRole role, boolean blocked, boolean awaitingFirstAccess, Instant lastLoginAt)`.
  - `interface MembershipDirectory` (todas exigem `OrgContext` = `orgId` antes da chamada, por causa do RLS) — `Optional<MembershipRole> activeRoleOf(UUID userId, UUID orgId)` (só vínculo `ACTIVE`), `Optional<MemberSummary> findMember(UUID userId, UUID orgId)`, `List<MemberSummary> listMembers(UUID orgId)` (ordem por e-mail), `void grant(UUID userId, UUID orgId, MembershipRole role)` (idempotente), `void block(UUID userId, UUID orgId)`, `void unblock(UUID userId, UUID orgId)` (ambos lançam `NotFoundException("Conta não encontrada nesta organização")`), `void recordLogin(UUID userId, UUID orgId)`.
  - `TestData.hash(String rawPassword): String` (hash `{argon2}` para criar usuários com senha nos testes).

- [ ] **Passo 1: Adicionar as dependências de criptografia**

Inserir no `os/backend/pom.xml` logo antes da linha `        <!-- Testes -->`:

```xml
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-crypto</artifactId>
        </dependency>
        <dependency>
            <!-- Argon2PasswordEncoder usa a implementação do BouncyCastle. -->
            <groupId>org.bouncycastle</groupId>
            <artifactId>bcprov-jdk18on</artifactId>
            <version>1.78.1</version>
        </dependency>
```

- [ ] **Passo 2: Escrever o teste do codificador (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/config/PasswordEncoderConfigTest.java` (porta do Beto_Banco com nomes em inglês):

```java
package com.xp77.os.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordEncoderConfigTest {

    private final PasswordEncoder encoder = new PasswordEncoderConfig().passwordEncoder();

    @Test
    void newPasswordsAreEncodedWithArgon2() {
        String hash = encoder.encode("senha-forte-123");

        assertThat(hash).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(encoder.matches("senha-forte-123", hash)).isTrue();
        assertThat(encoder.matches("outra-senha", hash)).isFalse();
    }

    @Test
    void bcryptHashesWithPrefixStillMatch() {
        String legacy = "{bcrypt}" + new BCryptPasswordEncoder().encode("senha-antiga");

        assertThat(encoder.matches("senha-antiga", legacy)).isTrue();
        assertThat(encoder.matches("senha-errada", legacy)).isFalse();
    }

    @Test
    void hashWithoutPrefixIsRejectedWithoutThrowing() {
        String withoutPrefix = new BCryptPasswordEncoder().encode("senha-antiga");

        assertThat(encoder.matches("senha-antiga", withoutPrefix)).isFalse();
    }

    @Test
    void twoEncodingsOfTheSamePasswordDiffer() {
        assertThat(encoder.encode("igual")).isNotEqualTo(encoder.encode("igual"));
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=PasswordEncoderConfigTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class PasswordEncoderConfig`.

- [ ] **Passo 3: Escrever `PasswordEncoderConfig`**

`os/backend/src/main/java/com/xp77/os/config/PasswordEncoderConfig.java`:

```java
package com.xp77.os.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Senhas novas em Argon2id. Hashes "{bcrypt}..." continuam aceitos (contas vindas
 * de outro sistema) e são promovidos para Argon2 no primeiro login bem-sucedido.
 * O DelegatingPasswordEncoder escolhe o algoritmo pelo prefixo {id} do hash.
 */
@Configuration
public class PasswordEncoderConfig {

    public static final String CURRENT_ID = "argon2";
    public static final String CURRENT_PREFIX = "{" + CURRENT_ID + "}";

    @Bean
    public PasswordEncoder passwordEncoder() {
        Map<String, PasswordEncoder> encoders = Map.of(
                CURRENT_ID, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(),
                "bcrypt", new BCryptPasswordEncoder());

        DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder(CURRENT_ID, encoders);

        // Hash sem prefixo não é adivinhado: recusar de forma limpa é melhor do que
        // supor um algoritmo. Este encoder só participa de matches() e nunca codifica.
        delegating.setDefaultPasswordEncoderForMatches(new PasswordEncoder() {
            @Override
            public String encode(CharSequence rawPassword) {
                throw new UnsupportedOperationException("encode sempre usa o algoritmo atual: " + CURRENT_ID);
            }

            @Override
            public boolean matches(CharSequence rawPassword, String encodedPassword) {
                return false;
            }
        });

        return delegating;
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=PasswordEncoderConfigTest test`
Expected: código de saída 0, `Tests run: 4, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 4: Acrescentar `hash` ao `TestData`**

Em `os/backend/src/test/java/com/xp77/os/support/TestData.java`, trocar o trecho

```java
import java.util.UUID;
```

por

```java
import com.xp77.os.config.PasswordEncoderConfig;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;
```

e trocar

```java
    private TestData() {
    }
```

por

```java
    private static final PasswordEncoder PASSWORDS = new PasswordEncoderConfig().passwordEncoder();

    private TestData() {
    }

    /** Hash {argon2} da senha, para criar usuários que conseguem entrar. */
    public static String hash(String rawPassword) {
        return PASSWORDS.encode(rawPassword);
    }
```

- [ ] **Passo 5: Escrever os testes dos serviços (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/users/UserDirectoryServiceTest.java`:

```java
package com.xp77.os.users;

import com.xp77.os.config.PasswordEncoderConfig;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserDirectoryServiceTest extends PostgresTestBase {

    private static final String PASSWORD = "senha-forte-123";

    @Autowired
    private UserDirectory users;

    private String newUserWithPassword(String prefix) {
        String email = TestData.uniqueEmail(prefix);
        TestData.createUser(email, TestData.hash(PASSWORD));
        return email;
    }

    private String storedHashOf(String email) {
        return ownerJdbc().queryForObject("select password_hash from users where email = ?", String.class, email);
    }

    @Test
    void verifyCredentialsAcceptsTheRightPasswordIgnoringEmailCaseAndSpaces() {
        String email = newUserWithPassword("certo");

        Optional<UserAccount> account = users.verifyCredentials("  " + email.toUpperCase() + " ", PASSWORD);

        assertThat(account).isPresent();
        assertThat(account.get().email()).isEqualTo(email);
        assertThat(account.get().hasPassword()).isTrue();
    }

    @Test
    void verifyCredentialsRejectsWrongPasswordAndUnknownEmail() {
        String email = newUserWithPassword("errado");

        assertThat(users.verifyCredentials(email, "outra-senha")).isEmpty();
        assertThat(users.verifyCredentials(TestData.uniqueEmail("ninguem"), PASSWORD)).isEmpty();
    }

    @Test
    void verifyCredentialsRejectsBlockedUserAndUserWithoutPassword() {
        String blocked = newUserWithPassword("bloqueado");
        ownerJdbc().update("update users set status = 'BLOCKED' where email = ?", blocked);
        String withoutPassword = TestData.uniqueEmail("sem-senha");
        TestData.createUser(withoutPassword, null);

        assertThat(users.verifyCredentials(blocked, PASSWORD)).isEmpty();
        assertThat(users.verifyCredentials(withoutPassword, PASSWORD)).isEmpty();
    }

    @Test
    void legacyBcryptHashIsPromotedToArgon2OnSuccessfulLogin() {
        String email = TestData.uniqueEmail("legado");
        TestData.createUser(email, "{bcrypt}" + new BCryptPasswordEncoder().encode(PASSWORD));

        assertThat(users.verifyCredentials(email, PASSWORD)).isPresent();
        assertThat(storedHashOf(email)).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(users.verifyCredentials(email, PASSWORD)).isPresent();
    }

    @Test
    void activeLookupsIgnoreBlockedUsers() {
        String email = newUserWithPassword("ativo");
        UUID id = users.findActiveByEmail(email).orElseThrow().id();
        assertThat(users.findActiveById(id)).isPresent();

        ownerJdbc().update("update users set status = 'BLOCKED' where id = ?", id);

        assertThat(users.findActiveById(id)).isEmpty();
        assertThat(users.findActiveByEmail(email)).isEmpty();
        assertThat(users.findByEmail(email.toUpperCase())).isPresent();
    }

    @Test
    void createWithoutPasswordStoresNormalizedEmailAndNameAndRejectsDuplicates() {
        String email = TestData.uniqueEmail("novo");

        UserAccount created = users.createWithoutPassword(" " + email.toUpperCase() + " ", "Maria Souza");

        assertThat(created.email()).isEqualTo(email);
        assertThat(created.name()).isEqualTo("Maria Souza");
        assertThat(created.hasPassword()).isFalse();
        assertThat(storedHashOf(email)).isNull();
        assertThatThrownBy(() -> users.createWithoutPassword(email, "Outra"))
                .isInstanceOf(BusinessException.class)
                .satisfies(e -> assertThat(((BusinessException) e).code()).isEqualTo(ErrorCode.CONFLICT));
    }

    @Test
    void setPasswordStoresArgon2HashAndRejectsUnknownUser() {
        UserAccount created = users.createWithoutPassword(TestData.uniqueEmail("define"), null);

        users.setPassword(created.id(), "minha-senha-nova");

        assertThat(storedHashOf(created.email())).startsWith(PasswordEncoderConfig.CURRENT_PREFIX);
        assertThat(users.verifyCredentials(created.email(), "minha-senha-nova")).isPresent();
        assertThatThrownBy(() -> users.setPassword(UUID.randomUUID(), "qualquer-coisa"))
                .isInstanceOf(NotFoundException.class);
    }
}
```

`os/backend/src/test/java/com/xp77/os/users/MembershipDirectoryServiceTest.java`:

```java
package com.xp77.os.users;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MembershipDirectoryServiceTest extends PostgresTestBase {

    @Autowired
    private MembershipDirectory memberships;

    private UUID member(UUID org, String role) {
        UUID user = TestData.createUser(TestData.uniqueEmail(role.toLowerCase()), null);
        TestData.addMembership(user, org, role);
        return user;
    }

    @Test
    void activeRoleOfReturnsTheRoleInsideItsOrganization() {
        UUID org = TestData.createOrg("Com papel");
        UUID user = member(org, "CLIENT");

        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).contains(MembershipRole.CLIENT);
    }

    @Test
    void activeRoleOfNeverSeesAnotherOrganizationsMembership() {
        UUID mine = TestData.createOrg("Minha");
        UUID other = TestData.createOrg("Outra");
        UUID user = member(other, "OWNER");

        assertThat(OrgContext.callAs(mine, () -> memberships.activeRoleOf(user, other))).isEmpty();
        assertThat(OrgContext.callAs(mine, () -> memberships.activeRoleOf(user, mine))).isEmpty();
    }

    @Test
    void blockedMembershipHasNoActiveRoleUntilUnblocked() {
        UUID org = TestData.createOrg("Bloqueio");
        UUID user = member(org, "TEAM");

        OrgContext.runAs(org, () -> memberships.block(user, org));
        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).isEmpty();
        assertThat(OrgContext.callAs(org, () -> memberships.findMember(user, org)))
                .map(MemberSummary::blocked).contains(true);

        OrgContext.runAs(org, () -> memberships.unblock(user, org));
        assertThat(OrgContext.callAs(org, () -> memberships.activeRoleOf(user, org))).contains(MembershipRole.TEAM);
    }

    @Test
    void blockingAnUnknownMembershipIsNotFound() {
        UUID org = TestData.createOrg("Sem vínculo");

        assertThatThrownBy(() -> OrgContext.runAs(org, () -> memberships.block(UUID.randomUUID(), org)))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void recordLoginStoresTheLastAccess() {
        UUID org = TestData.createOrg("Último acesso");
        UUID user = member(org, "ADMIN");

        OrgContext.runAs(org, () -> memberships.recordLogin(user, org));

        assertThat(OrgContext.callAs(org, () -> memberships.findMember(user, org)))
                .map(MemberSummary::lastLoginAt).isPresent();
    }

    @Test
    void listMembersReturnsOnlyThisOrganizationWithTheirData() {
        UUID org = TestData.createOrg("Lista");
        UUID other = TestData.createOrg("Vizinha");
        String email = TestData.uniqueEmail("aaa-lista");
        UUID named = TestData.createUser(email, TestData.hash("senha-forte-123"));
        ownerJdbc().update("update users set name = 'Ana Lima' where id = ?", named);
        TestData.addMembership(named, org, "CLIENT");
        UUID pending = member(org, "TEAM");
        member(other, "TEAM");

        List<MemberSummary> list = OrgContext.callAs(org, () -> memberships.listMembers(org));

        assertThat(list).extracting(MemberSummary::userId).containsExactlyInAnyOrder(named, pending);
        MemberSummary ana = list.stream().filter(m -> m.userId().equals(named)).findFirst().orElseThrow();
        assertThat(ana.email()).isEqualTo(email);
        assertThat(ana.name()).isEqualTo("Ana Lima");
        assertThat(ana.role()).isEqualTo(MembershipRole.CLIENT);
        assertThat(ana.awaitingFirstAccess()).isFalse();
        assertThat(list.stream().filter(m -> m.userId().equals(pending)).findFirst().orElseThrow()
                .awaitingFirstAccess()).isTrue();
    }

    @Test
    void grantIsIdempotentAndKeepsTheFirstRole() {
        UUID org = TestData.createOrg("Vínculo");
        UUID user = TestData.createUser(TestData.uniqueEmail("vinculo"), null);

        OrgContext.runAs(org, () -> memberships.grant(user, org, MembershipRole.ADMIN));
        OrgContext.runAs(org, () -> memberships.grant(user, org, MembershipRole.TEAM));

        assertThat(ownerJdbc().queryForList(
                "select role from memberships where user_id = ?", String.class, user)).containsExactly("ADMIN");
    }

    @Test
    void grantForAnotherOrganizationIsRefusedByTheDatabase() {
        UUID mine = TestData.createOrg("Contexto");
        UUID other = TestData.createOrg("Alvo");
        UUID user = TestData.createUser(TestData.uniqueEmail("intruso"), null);

        assertThatThrownBy(() -> OrgContext.runAs(mine, () -> memberships.grant(user, other, MembershipRole.TEAM)))
                .isInstanceOf(DataAccessException.class);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='UserDirectoryServiceTest,MembershipDirectoryServiceTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol` para `UserDirectory`, `UserAccount`, `MembershipDirectory` e `MemberSummary`.

- [ ] **Passo 6: Acrescentar ao `MembershipRepository` as consultas com os dados da pessoa**

Em `os/backend/src/main/java/com/xp77/os/users/repository/MembershipRepository.java`, trocar o arquivo inteiro por:

```java
package com.xp77.os.users.repository;

import com.xp77.os.users.entity.Membership;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembershipRepository extends JpaRepository<Membership, UUID> {

    Optional<Membership> findByUserIdAndOrgId(UUID userId, UUID orgId);

    /** Cada linha: [Membership, User]. Mesmo módulo, então a junção fica aqui dentro. */
    @Query("""
           SELECT m, u FROM Membership m, User u
            WHERE u.id = m.userId AND m.orgId = :orgId
            ORDER BY u.email
           """)
    List<Object[]> findMembersWithUsers(@Param("orgId") UUID orgId);

    @Query("""
           SELECT m, u FROM Membership m, User u
            WHERE u.id = m.userId AND m.orgId = :orgId AND m.userId = :userId
           """)
    List<Object[]> findMemberWithUser(@Param("userId") UUID userId, @Param("orgId") UUID orgId);
}
```

- [ ] **Passo 7: Escrever a API e os serviços**

`os/backend/src/main/java/com/xp77/os/users/api/UserAccount.java`:

```java
package com.xp77.os.users.api;

import java.util.UUID;

/**
 * Visão pública de uma pessoa. Sem o hash da senha (o que não trafega não vaza);
 * hasPassword diz só se ela já passou pelo primeiro acesso.
 */
public record UserAccount(UUID id, String email, String name, boolean hasPassword) {
}
```

`os/backend/src/main/java/com/xp77/os/users/api/UserDirectory.java`:

```java
package com.xp77.os.users.api;

import java.util.Optional;
import java.util.UUID;

/** Única porta de outros módulos para a identidade global (tabela users, sem RLS). */
public interface UserDirectory {

    Optional<UserAccount> findActiveById(UUID id);

    Optional<UserAccount> findActiveByEmail(String email);

    /** Qualquer situação (inclusive bloqueada). */
    Optional<UserAccount> findByEmail(String email);

    /**
     * Confere a senha de uma pessoa ativa. Hash em algoritmo antigo é promovido para
     * o atual aqui dentro, porque só este módulo conhece o formato do hash.
     */
    Optional<UserAccount> verifyCredentials(String email, String password);

    /** Pessoa sem senha: ela cria a senha pelo link de primeiro acesso. name pode ser nulo. */
    UserAccount createWithoutPassword(String email, String name);

    void setPassword(UUID userId, String newPassword);
}
```

`os/backend/src/main/java/com/xp77/os/users/api/MemberSummary.java`:

```java
package com.xp77.os.users.api;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma conta de acesso vista de dentro de uma organização.
 *
 * @param blocked             o vínculo está bloqueado nesta organização
 * @param awaitingFirstAccess a pessoa ainda não criou a senha
 * @param lastLoginAt         último login nesta organização (nulo se nunca entrou)
 */
public record MemberSummary(UUID userId, String email, String name, MembershipRole role,
                            boolean blocked, boolean awaitingFirstAccess, Instant lastLoginAt) {
}
```

`os/backend/src/main/java/com/xp77/os/users/api/MembershipDirectory.java`:

```java
package com.xp77.os.users.api;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Vínculos pessoa × organização. A tabela tem RLS: chame sempre com OrgContext igual
 * a orgId (OrgContext.callAs), senão o banco não mostra nem aceita o vínculo.
 */
public interface MembershipDirectory {

    /** Tipo de conta, só se o vínculo estiver ACTIVE. É o que login e renovação consultam. */
    Optional<MembershipRole> activeRoleOf(UUID userId, UUID orgId);

    Optional<MemberSummary> findMember(UUID userId, UUID orgId);

    /** Contas da organização, em ordem de e-mail. */
    List<MemberSummary> listMembers(UUID orgId);

    /** Cria o vínculo com o tipo informado; se já existir, não muda nada. */
    void grant(UUID userId, UUID orgId, MembershipRole role);

    void block(UUID userId, UUID orgId);

    void unblock(UUID userId, UUID orgId);

    /** Marca o último acesso da pessoa nesta organização. */
    void recordLogin(UUID userId, UUID orgId);
}
```

`os/backend/src/main/java/com/xp77/os/users/service/UserDirectoryService.java`:

```java
package com.xp77.os.users.service;

import com.xp77.os.config.PasswordEncoderConfig;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import com.xp77.os.users.entity.User;
import com.xp77.os.users.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserDirectoryService implements UserDirectory {

    private static final Logger log = LoggerFactory.getLogger(UserDirectoryService.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;

    public UserDirectoryService(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveById(UUID id) {
        return users.findById(id).filter(User::isActive).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findActiveByEmail(String email) {
        return users.findByEmail(normalize(email)).filter(User::isActive).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<UserAccount> findByEmail(String email) {
        return users.findByEmail(normalize(email)).map(UserDirectoryService::toAccount);
    }

    @Override
    @Transactional
    public Optional<UserAccount> verifyCredentials(String email, String password) {
        Optional<User> found = users.findByEmail(normalize(email));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        User user = found.get();
        if (!user.isActive() || !user.hasPassword() || password == null
                || !encoder.matches(password, user.getPasswordHash())) {
            return Optional.empty();
        }
        promoteHashIfNeeded(user, password);
        return Optional.of(toAccount(user));
    }

    @Override
    @Transactional
    public UserAccount createWithoutPassword(String email, String name) {
        String normalized = normalize(email);
        if (users.existsByEmail(normalized)) {
            throw new BusinessException(ErrorCode.CONFLICT, "E-mail já cadastrado");
        }
        String cleanName = name == null || name.isBlank() ? null : name.trim();
        return toAccount(users.saveAndFlush(new User(normalized, cleanName, null)));
    }

    @Override
    @Transactional
    public void setPassword(UUID userId, String newPassword) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado"));
        user.setPasswordHash(encoder.encode(newPassword));
        users.saveAndFlush(user);
    }

    /** No primeiro login de um hash antigo, a senha é regravada no algoritmo atual. */
    private void promoteHashIfNeeded(User user, String password) {
        if (!user.getPasswordHash().startsWith(PasswordEncoderConfig.CURRENT_PREFIX)) {
            user.setPasswordHash(encoder.encode(password));
            users.saveAndFlush(user);
            log.info("Hash de senha promovido para {} no usuário {}", PasswordEncoderConfig.CURRENT_ID, user.getId());
        }
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private static UserAccount toAccount(User user) {
        return new UserAccount(user.getId(), user.getEmail(), user.getName(), user.hasPassword());
    }
}
```

`os/backend/src/main/java/com/xp77/os/users/service/MembershipDirectoryService.java`:

```java
package com.xp77.os.users.service;

import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.entity.Membership;
import com.xp77.os.users.entity.User;
import com.xp77.os.users.repository.MembershipRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MembershipDirectoryService implements MembershipDirectory {

    private final MembershipRepository memberships;

    public MembershipDirectoryService(MembershipRepository memberships) {
        this.memberships = memberships;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MembershipRole> activeRoleOf(UUID userId, UUID orgId) {
        return memberships.findByUserIdAndOrgId(userId, orgId)
                .filter(Membership::isActive)
                .map(Membership::getRole);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<MemberSummary> findMember(UUID userId, UUID orgId) {
        return memberships.findMemberWithUser(userId, orgId).stream()
                .map(MembershipDirectoryService::toSummary)
                .findFirst();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MemberSummary> listMembers(UUID orgId) {
        return memberships.findMembersWithUsers(orgId).stream()
                .map(MembershipDirectoryService::toSummary)
                .toList();
    }

    @Override
    @Transactional
    public void grant(UUID userId, UUID orgId, MembershipRole role) {
        if (memberships.findByUserIdAndOrgId(userId, orgId).isEmpty()) {
            memberships.saveAndFlush(new Membership(userId, orgId, role));
        }
    }

    @Override
    @Transactional
    public void block(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.block();
        memberships.saveAndFlush(membership);
    }

    @Override
    @Transactional
    public void unblock(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.unblock();
        memberships.saveAndFlush(membership);
    }

    @Override
    @Transactional
    public void recordLogin(UUID userId, UUID orgId) {
        Membership membership = existing(userId, orgId);
        membership.recordLogin(Instant.now());
        memberships.saveAndFlush(membership);
    }

    private Membership existing(UUID userId, UUID orgId) {
        return memberships.findByUserIdAndOrgId(userId, orgId)
                .orElseThrow(() -> new NotFoundException("Conta não encontrada nesta organização"));
    }

    private static MemberSummary toSummary(Object[] row) {
        Membership membership = (Membership) row[0];
        User user = (User) row[1];
        return new MemberSummary(user.getId(), user.getEmail(), user.getName(), membership.getRole(),
                !membership.isActive(), !user.hasPassword(), membership.getLastLoginAt());
    }
}
```

- [ ] **Passo 8: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='UserDirectoryServiceTest,MembershipDirectoryServiceTest' test`
Expected: código de saída 0, `Tests run: 15, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 9: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 10: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src/main/java/com/xp77/os/config/PasswordEncoderConfig.java os/backend/src/main/java/com/xp77/os/users os/backend/src/test/java/com/xp77/os/support/TestData.java os/backend/src/test/java/com/xp77/os/config/PasswordEncoderConfigTest.java os/backend/src/test/java/com/xp77/os/users
git commit -m "feat(users): add user and membership directories with Argon2 password encoding" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 7: JWT, cadeia de segurança, respostas 401/403 no envelope e organização por requisição

**Arquivos:**
- Modify: `os/backend/pom.xml` (`spring-boot-starter-security`, `jjwt-api`, `jjwt-impl`, `jjwt-jackson`)
- Create: `os/backend/src/main/java/com/xp77/os/security/AuthenticatedUser.java`, `security/JwtService.java`, `security/JwtAuthFilter.java`, `security/SecurityConfig.java`, `security/OrgContextFilter.java`
- Create (cópia): `os/backend/src/main/java/com/xp77/os/security/EnvelopeAuthenticationEntryPoint.java`, `security/EnvelopeAccessDeniedHandler.java`
- Modify: `os/backend/src/main/java/com/xp77/os/shared/exception/GlobalExceptionHandler.java` (volta o tratamento de `AccessDeniedException`)
- Modify: `os/backend/src/main/resources/application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml`
- Test: `os/backend/src/test/java/com/xp77/os/security/JwtServiceTest.java`, `security/SecurityConfigTest.java`, `security/OrgContextFilterTest.java`

**Interfaces:**
- Consumes: `OrgContext`, `OrgResolver`, `RootOrganization` (Tarefa 5); envelope e `TraceIdFilter` (Tarefa 2).
- Produces:
  - `record AuthenticatedUser(UUID userId, UUID orgId, String email, String role)` com `String authority()` (`"ROLE_" + role`) — é o objeto injetado por `@AuthenticationPrincipal`.
  - `JwtService` — `JwtService(String secret, long accessTokenMinutes)` (lança `IllegalStateException` com segredo < 32 bytes), `String generate(UUID userId, UUID orgId, String email, String role)`, `Optional<AuthenticatedUser> validate(String token)`, `long lifetimeSeconds()`.
  - `SecurityConfig`: stateless, CSRF desligado, `GET /auth/me` e `POST /auth/change-password` autenticados, resto de `/auth/**` público, `/actuator/health/**` e `/actuator/info` públicos, `/admin/**` com `ROLE_OWNER` ou `ROLE_ADMIN`, `/portal/**` só com `ROLE_CLIENT`, todo o resto autenticado; CORS com `xp77.cors.allowed-origins`.
  - `OrgContextFilter` (`@Order(SecurityProperties.DEFAULT_FILTER_ORDER + 10)`, depois da autenticação): `OrgContext` = claim `org` do token ou, sem token, `OrgResolver.resolve(request.getServerName())`; limpa no fim.
  - Propriedades: `xp77.auth.jwt-secret`, `xp77.auth.access-token-minutes` (15), `xp77.cors.allowed-origins`.

- [ ] **Passo 1: Adicionar Spring Security e jjwt**

Inserir no `os/backend/pom.xml` logo antes da linha `        <!-- Testes -->`:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.6</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
```

- [ ] **Passo 2: Configuração de JWT e CORS nos perfis**

Acrescentar ao final de `os/backend/src/main/resources/application.yml`:

```yaml

xp77:
  auth:
    access-token-minutes: 15
```

Acrescentar ao final de `os/backend/src/main/resources/application-dev.yml`:

```yaml

xp77:
  auth:
    jwt-secret: ${JWT_SECRET:desenvolvimento-local-troque-isto-em-producao-32b}
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

Acrescentar ao final de `os/backend/src/main/resources/application-test.yml`:

```yaml

xp77:
  auth:
    jwt-secret: segredo-de-teste-com-mais-de-32-bytes-para-hs256
  cors:
    allowed-origins: http://localhost:5173
```

Acrescentar ao final de `os/backend/src/main/resources/application-prod.yml`:

```yaml

xp77:
  auth:
    jwt-secret: ${JWT_SECRET}
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS}
```

- [ ] **Passo 3: Escrever o teste do JWT (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/security/JwtServiceTest.java`:

```java
package com.xp77.os.security;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "segredo-de-teste-com-mais-de-32-bytes-para-hs256";

    private final JwtService jwt = new JwtService(SECRET, 15);

    @Test
    void validTokenCarriesUserOrganizationEmailAndRole() {
        UUID user = UUID.randomUUID();
        UUID org = UUID.randomUUID();

        AuthenticatedUser authenticated = jwt.validate(jwt.generate(user, org, "dono@exemplo.com", "OWNER"))
                .orElseThrow();

        assertThat(authenticated.userId()).isEqualTo(user);
        assertThat(authenticated.orgId()).isEqualTo(org);
        assertThat(authenticated.email()).isEqualTo("dono@exemplo.com");
        assertThat(authenticated.role()).isEqualTo("OWNER");
        assertThat(authenticated.authority()).isEqualTo("ROLE_OWNER");
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        String forged = new JwtService("outro-segredo-totalmente-diferente-com-32b", 15)
                .generate(UUID.randomUUID(), UUID.randomUUID(), "invasor@exemplo.com", "OWNER");

        assertThat(jwt.validate(forged)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        String expired = new JwtService(SECRET, -1)
                .generate(UUID.randomUUID(), UUID.randomUUID(), "a@exemplo.com", "TEAM");

        assertThat(jwt.validate(expired)).isEmpty();
    }

    @Test
    void garbageIsRejectedWithoutThrowing() {
        assertThat(jwt.validate("isto-nao-e-um-jwt")).isEmpty();
        assertThat(jwt.validate("")).isEmpty();
        assertThat(jwt.validate(null)).isEmpty();
    }

    @Test
    void twoTokensForTheSameUserHaveDistinctIds() {
        UUID user = UUID.randomUUID();
        UUID org = UUID.randomUUID();

        assertThat(jwt.generate(user, org, "a@b.com", "TEAM")).isNotEqualTo(jwt.generate(user, org, "a@b.com", "TEAM"));
    }

    @Test
    void lifetimeIsExposedInSeconds() {
        assertThat(jwt.lifetimeSeconds()).isEqualTo(900L);
    }

    @Test
    void secretShorterThan32BytesPreventsStartup() {
        assertThatThrownBy(() -> new JwtService("curto-demais", 15))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
        assertThatThrownBy(() -> new JwtService(null, 15)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tokensAreSignedWithHs256() {
        String token = jwt.generate(UUID.randomUUID(), UUID.randomUUID(), "a@b.com", "ADMIN");
        String header = new String(Base64.getUrlDecoder().decode(token.split("\\.")[0]), StandardCharsets.UTF_8);

        assertThat(header).contains("\"alg\":\"HS256\"");
    }

    @Test
    void tokenWithoutOrganizationOrRoleIsRejected() {
        SecretKeySpec key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        Date inOneMinute = Date.from(Instant.now().plusSeconds(60));
        String withoutRole = Jwts.builder().subject(UUID.randomUUID().toString())
                .claim("org", UUID.randomUUID().toString()).claim("email", "a@b.com")
                .expiration(inOneMinute).signWith(key, Jwts.SIG.HS256).compact();
        String withoutOrg = Jwts.builder().subject(UUID.randomUUID().toString())
                .claim("roles", java.util.List.of("OWNER")).claim("email", "a@b.com")
                .expiration(inOneMinute).signWith(key, Jwts.SIG.HS256).compact();

        assertThat(jwt.validate(withoutRole)).isEmpty();
        assertThat(jwt.validate(withoutOrg)).isEmpty();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=JwtServiceTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class JwtService`.

- [ ] **Passo 4: Escrever `AuthenticatedUser` e `JwtService`**

`os/backend/src/main/java/com/xp77/os/security/AuthenticatedUser.java`:

```java
package com.xp77.os.security;

import java.util.UUID;

/**
 * Identidade extraída do access token, injetada por {@code @AuthenticationPrincipal}.
 * Pessoa e organização vêm sempre do token, nunca do corpo ou da URL.
 */
public record AuthenticatedUser(UUID userId, UUID orgId, String email, String role) {

    /** Autoridade do Spring Security: ROLE_OWNER, ROLE_ADMIN ou ROLE_TEAM. */
    public String authority() {
        return "ROLE_" + role;
    }
}
```

`os/backend/src/main/java/com/xp77/os/security/JwtService.java`:

```java
package com.xp77.os.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Access token JWT HS256 com sub, jti, email, org e roles. */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    static final String CLAIM_EMAIL = "email";
    static final String CLAIM_ORG = "org";
    static final String CLAIM_ROLES = "roles";

    private final SecretKey key;
    private final Duration lifetime;

    public JwtService(@Value("${xp77.auth.jwt-secret}") String secret,
                      @Value("${xp77.auth.access-token-minutes}") long accessTokenMinutes) {
        byte[] bytes = secret == null ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        // Falha rápido: sem segredo forte qualquer um forja token, e o sintoma só
        // apareceria em produção. Construtor de bean que falha = aplicação não sobe.
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET ausente ou com menos de 32 bytes; HS256 exige pelo menos isso.");
        }
        this.key = new SecretKeySpec(bytes, "HmacSHA256");
        this.lifetime = Duration.ofMinutes(accessTokenMinutes);
    }

    public String generate(UUID userId, UUID orgId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .id(UUID.randomUUID().toString())
                .claim(CLAIM_EMAIL, email)
                .claim(CLAIM_ORG, orgId.toString())
                .claim(CLAIM_ROLES, List.of(role))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(lifetime)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Optional<AuthenticatedUser> validate(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            List<?> roles = claims.get(CLAIM_ROLES, List.class);
            String org = claims.get(CLAIM_ORG, String.class);
            if (roles == null || roles.isEmpty() || org == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthenticatedUser(
                    UUID.fromString(claims.getSubject()),
                    UUID.fromString(org),
                    claims.get(CLAIM_EMAIL, String.class),
                    String.valueOf(roles.get(0))));
        } catch (Exception e) {
            // Token inválido não é erro do servidor: não polui o log em ERROR.
            log.debug("Token recusado: {}", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    public long lifetimeSeconds() {
        return lifetime.toSeconds();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=JwtServiceTest test`
Expected: código de saída 0, `Tests run: 9, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Escrever os testes da cadeia de segurança e do filtro de organização (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/security/SecurityConfigTest.java`:

```java
package com.xp77.os.security;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SecurityConfigTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwt;

    private String bearer(String role) {
        return "Bearer " + jwt.generate(UUID.randomUUID(), RootOrganization.ID, "pessoa@exemplo.com", role);
    }

    @Test
    void protectedRouteWithoutTokenReturns401Envelope() throws Exception {
        mockMvc.perform(get("/qualquer-rota-protegida"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.status").value(401))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void invalidTokenDoesNotAuthenticate() throws Exception {
        mockMvc.perform(get("/qualquer-rota-protegida").header("Authorization", "Bearer lixo.nao.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    void teamMemberGets403EnvelopeOnAdminRoutes() throws Exception {
        mockMvc.perform(get("/admin/qualquer").header("Authorization", bearer("TEAM")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.status").value(403));
    }

    @Test
    void ownerAndAdminPassTheAdminGate() throws Exception {
        mockMvc.perform(get("/admin/rota-inexistente").header("Authorization", bearer("OWNER")))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/admin/rota-inexistente").header("Authorization", bearer("ADMIN")))
                .andExpect(status().isNotFound());
    }

    @Test
    void clientGets403OnAdminRoutes() throws Exception {
        mockMvc.perform(get("/admin/qualquer").header("Authorization", bearer("CLIENT")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void onlyClientsEnterThePortal() throws Exception {
        for (String teamRole : new String[] {"OWNER", "ADMIN", "TEAM"}) {
            mockMvc.perform(get("/portal/qualquer").header("Authorization", bearer(teamRole)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
        }
        mockMvc.perform(get("/portal/rota-inexistente").header("Authorization", bearer("CLIENT")))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicRoutesStayOpen() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isNotEqualTo(401));
    }

    @Test
    void meAndChangePasswordRequireAToken() throws Exception {
        mockMvc.perform(get("/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/auth/change-password").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void accessDeniedThrownByAControllerBecomes403Envelope() throws Exception {
        mockMvc.perform(get("/test-security/denied").header("Authorization", bearer("TEAM")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.error.message").value("Acesso negado"));
    }

    @Test
    void corsAllowsOnlyTheConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mockMvc.perform(options("/auth/login")
                        .header("Origin", "http://malicioso.exemplo")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden());
    }

    @TestConfiguration
    static class DeniedControllerConfig {
        @Bean
        DeniedController deniedController() {
            return new DeniedController();
        }
    }

    @RestController
    static class DeniedController {
        @GetMapping("/test-security/denied")
        void denied() {
            throw new AccessDeniedException("negado");
        }
    }
}
```

`os/backend/src/test/java/com/xp77/os/security/OrgContextFilterTest.java`:

```java
package com.xp77.os.security;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OrgContextFilterTest {

    private final UUID hostOrg = UUID.randomUUID();
    private final OrgContextFilter filter = new OrgContextFilter(
            host -> "cliente.exemplo.com".equals(host) ? hostOrg : RootOrganization.ID);

    @AfterEach
    void clean() {
        SecurityContextHolder.clearContext();
        OrgContext.clear();
    }

    private UUID orgSeenInsideTheChain(MockHttpServletRequest request) throws Exception {
        AtomicReference<UUID> seen = new AtomicReference<>();
        filter.doFilter(request, new MockHttpServletResponse(),
                (req, res) -> seen.set(OrgContext.current().orElse(null)));
        return seen.get();
    }

    @Test
    void authenticatedRequestUsesTheOrganizationFromTheToken() throws Exception {
        UUID tokenOrg = UUID.randomUUID();
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), tokenOrg, "dono@exemplo.com", "OWNER");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("cliente.exemplo.com");

        assertThat(orgSeenInsideTheChain(request)).isEqualTo(tokenOrg);
        assertThat(OrgContext.current()).isEmpty();
    }

    @Test
    void publicRequestResolvesTheOrganizationByHost() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setServerName("cliente.exemplo.com");

        assertThat(orgSeenInsideTheChain(request)).isEqualTo(hostOrg);
    }

    @Test
    void contextIsClearedEvenWhenTheChainFails() {
        MockHttpServletRequest request = new MockHttpServletRequest();

        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            throw new ServletException("falhou");
        })).isInstanceOf(ServletException.class);
        assertThat(OrgContext.current()).isEmpty();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='SecurityConfigTest,OrgContextFilterTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class OrgContextFilter`.

- [ ] **Passo 6: Copiar os tratadores de 401/403 do Beto_Banco**

```bash
cd /c/Users/wende/dev/77.tech
BETO=/c/Users/wende/OneDrive/Documentos/Beto_project/Beto_Banco/backend
M=os/backend/src/main/java/com/xp77/os/security
mkdir -p $M
for f in EnvelopeAuthenticationEntryPoint EnvelopeAccessDeniedHandler; do
  sed 's/com\.betobanco/com.xp77.os/g' "$BETO/src/main/java/com/betobanco/security/$f.java" > "$M/$f.java"
done
```

- [ ] **Passo 7: Escrever `JwtAuthFilter`, `SecurityConfig` e `OrgContextFilter`**

`os/backend/src/main/java/com/xp77/os/security/JwtAuthFilter.java`:

```java
package com.xp77.os.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Autentica pela presença de um access token válido. NUNCA rejeita: token inválido
 * só não autentica, e quem responde 401 no envelope é o EnvelopeAuthenticationEntryPoint.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private static final String PREFIX = "Bearer ";

    private final JwtService jwt;

    public JwtAuthFilter(JwtService jwt) {
        this.jwt = jwt;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(PREFIX)) {
            jwt.validate(header.substring(PREFIX.length())).ifPresent(user -> {
                var authentication = new UsernamePasswordAuthenticationToken(
                        user, null, List.of(new SimpleGrantedAuthority(user.authority())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            });
        }
        chain.doFilter(request, response);
    }
}
```

`os/backend/src/main/java/com/xp77/os/security/SecurityConfig.java`:

```java
package com.xp77.os.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final EnvelopeAuthenticationEntryPoint entryPoint;
    private final EnvelopeAccessDeniedHandler accessDeniedHandler;
    private final List<String> allowedOrigins;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter,
                          EnvelopeAuthenticationEntryPoint entryPoint,
                          EnvelopeAccessDeniedHandler accessDeniedHandler,
                          @Value("${xp77.cors.allowed-origins}") String allowedOrigins) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.entryPoint = entryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(origin -> !origin.isEmpty()).toList();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ATENÇÃO: os matchers são relativos ao context-path /api/v1;
                        // "/api/v1/auth/**" não casaria com nada. A primeira regra que casa
                        // é a que vale: as rotas de /auth que exigem sessão vêm antes do permitAll.
                        .requestMatchers(HttpMethod.GET, "/auth/me").authenticated()
                        .requestMatchers(HttpMethod.POST, "/auth/change-password").authenticated()
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info").permitAll()
                        // Só existem com o springdoc ligado (dev e test); em prod as rotas nem existem.
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        .requestMatchers("/admin/**").hasAnyRole("OWNER", "ADMIN")
                        // Área do cliente: só CLIENT. A equipe recebe 403 aqui, e o cliente em /admin/**.
                        .requestMatchers("/portal/**").hasRole("CLIENT")
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("X-Trace-Id"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

`os/backend/src/main/java/com/xp77/os/security/OrgContextFilter.java`:

```java
package com.xp77.os.security;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.OrgResolver;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.autoconfigure.security.SecurityProperties;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Define a organização da requisição. Roda logo depois da cadeia do Spring Security
 * (que já autenticou pelo JWT): com token, vale a claim org; sem token (rotas
 * públicas), o domínio da requisição, com a 77xp como padrão.
 */
@Component
@Order(SecurityProperties.DEFAULT_FILTER_ORDER + 10)
public class OrgContextFilter extends OncePerRequestFilter {

    private final OrgResolver resolver;

    public OrgContextFilter(OrgResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        OrgContext.set(organizationOf(request));
        try {
            chain.doFilter(request, response);
        } finally {
            OrgContext.clear();
        }
    }

    private UUID organizationOf(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.orgId();
        }
        return resolver.resolve(request.getServerName());
    }
}
```

- [ ] **Passo 8: Devolver ao `GlobalExceptionHandler` o tratamento de `AccessDeniedException`**

Em `os/backend/src/main/java/com/xp77/os/shared/exception/GlobalExceptionHandler.java`, trocar

```java
import org.springframework.http.converter.HttpMessageNotReadableException;
```

por

```java
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
```

e trocar

```java
        return montar(ex.code(), ex.getMessage(), ex.code().httpStatus(), req.getRequestURI(), List.of());
    }
```

por

```java
        return montar(ex.code(), ex.getMessage(), ex.code().httpStatus(), req.getRequestURI(), List.of());
    }

    /** Negação lançada dentro de um controller (ex.: @PreAuthorize): 403 no envelope, nunca 500. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> negado(AccessDeniedException ex,
                                                    HttpServletRequest req) {
        log.warn("Acesso negado em {}", req.getRequestURI());
        return montar(ErrorCode.FORBIDDEN, "Acesso negado",
                ErrorCode.FORBIDDEN.httpStatus(), req.getRequestURI(), List.of());
    }
```

- [ ] **Passo 9: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='SecurityConfigTest,OrgContextFilterTest' test`
Expected: código de saída 0, `Tests run: 13, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 10: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 11: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src/main/resources os/backend/src/main/java/com/xp77/os/security os/backend/src/main/java/com/xp77/os/shared/exception/GlobalExceptionHandler.java os/backend/src/test/java/com/xp77/os/security
git commit -m "feat(security): add JWT authentication, stateless filter chain and per-request organization context" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 8: V5, sessões com refresh token rotativo e cookie `xp_refresh`

**Arquivos:**
- Create: `os/backend/src/main/resources/db/migration/V5__session_tokens.sql`
- Create: `os/backend/src/main/java/com/xp77/os/auth/entity/RefreshToken.java`, `auth/repository/RefreshTokenRepository.java`, `auth/service/OpaqueTokens.java`, `auth/service/RefreshTokenService.java`, `auth/service/RefreshCookies.java`
- Modify: `os/backend/src/main/resources/application.yml`, `application-dev.yml`, `application-test.yml`
- Test: `os/backend/src/test/java/com/xp77/os/auth/OpaqueTokensTest.java`, `auth/RefreshCookiesTest.java`, `auth/RefreshTokenServiceTest.java`

**Interfaces:**
- Consumes: `UserDirectory.findActiveById`, `UserAccount` (Tarefa 6); `RootOrganization` (Tarefa 5); `TestData` (Tarefas 4 e 6).
- Produces:
  - Tabelas `refresh_tokens` (com `org_id` e `family_id`) e `password_reset_tokens` (a entidade desta última vem na Tarefa 11).
  - `final class OpaqueTokens` — `static String newValue()` (32 bytes aleatórios em Base64 URL sem padding, 43 caracteres), `static String sha256Hex(String value)`.
  - `RefreshTokenService` — `record Origin(String ip, String userAgent)` (com `Origin.UNKNOWN`), `record Rotation(UUID userId, UUID orgId, String email, String newValue)`, `String issue(UUID userId, UUID orgId, Origin origin)`, `Optional<Rotation> rotate(String value, Origin origin)`, `Optional<UUID> revoke(String value)` (devolve o dono da sessão), `void revokeAll(UUID userId)`.
  - `RefreshCookies` — `NAME = "xp_refresh"`, `PATH = "/api/v1/auth"`, `ResponseCookie issue(String value)`, `ResponseCookie clear()`.
  - Propriedades: `xp77.auth.refresh-token-days` (30), `xp77.auth.max-active-sessions` (`${MAX_ACTIVE_SESSIONS:3}`), `xp77.auth.cookie-secure` (true; false em dev/test), `xp77.auth.cookie-same-site` (Lax).

Diferenças em relação ao Beto_Banco: cada sessão guarda a organização em que nasceu (`org_id`, usada para emitir o novo access token na renovação) e a família (`family_id`, a cadeia de rotações de um login, pedida na spec); o sucessor de uma rotação guarda o IP e o aparelho da renovação (no Beto_Banco ficava sem origem); geração e hash de token ficam num lugar só (`OpaqueTokens`, antes duplicados); o alerta de “muitos IPs” e a listagem de sessões do Beto_Banco (proteção de conteúdo de curso) não entram.

- [ ] **Passo 1: Configuração das sessões**

Em `os/backend/src/main/resources/application.yml`, trocar

```yaml
    access-token-minutes: 15
```

por

```yaml
    access-token-minutes: 15
    refresh-token-days: 30
    max-active-sessions: ${MAX_ACTIVE_SESSIONS:3}
    cookie-secure: true
    cookie-same-site: Lax
```

Em `os/backend/src/main/resources/application-dev.yml`, trocar

```yaml
    jwt-secret: ${JWT_SECRET:desenvolvimento-local-troque-isto-em-producao-32b}
```

por

```yaml
    jwt-secret: ${JWT_SECRET:desenvolvimento-local-troque-isto-em-producao-32b}
    # http://localhost não tem HTTPS: cookie Secure não voltaria ao servidor.
    cookie-secure: false
```

Em `os/backend/src/main/resources/application-test.yml`, trocar

```yaml
    jwt-secret: segredo-de-teste-com-mais-de-32-bytes-para-hs256
```

por

```yaml
    jwt-secret: segredo-de-teste-com-mais-de-32-bytes-para-hs256
    cookie-secure: false
```

- [ ] **Passo 2: Escrever os testes (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/auth/OpaqueTokensTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.service.OpaqueTokens;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpaqueTokensTest {

    @Test
    void newValuesHave256RandomBitsInUrlSafeText() {
        String value = OpaqueTokens.newValue();

        assertThat(value).matches("[A-Za-z0-9_-]{43}");
        assertThat(OpaqueTokens.newValue()).isNotEqualTo(value);
    }

    @Test
    void hashIsHexSha256() {
        assertThat(OpaqueTokens.sha256Hex("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
```

`os/backend/src/test/java/com/xp77/os/auth/RefreshCookiesTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.service.RefreshCookies;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseCookie;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshCookiesTest {

    @Test
    void issuedCookieIsHttpOnlySecureLaxAndScopedToAuthRoutes() {
        ResponseCookie cookie = new RefreshCookies(true, "Lax", 30).issue("valor");

        assertThat(cookie.getName()).isEqualTo("xp_refresh");
        assertThat(cookie.getValue()).isEqualTo("valor");
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.isSecure()).isTrue();
        assertThat(cookie.getSameSite()).isEqualTo("Lax");
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(cookie.getMaxAge()).isEqualTo(Duration.ofDays(30));
    }

    @Test
    void clearingExpiresTheCookieImmediately() {
        ResponseCookie cookie = new RefreshCookies(false, "Lax", 30).clear();

        assertThat(cookie.getName()).isEqualTo("xp_refresh");
        assertThat(cookie.getValue()).isEmpty();
        assertThat(cookie.getMaxAge()).isZero();
        assertThat(cookie.isSecure()).isFalse();
    }
}
```

`os/backend/src/test/java/com/xp77/os/auth/RefreshTokenServiceTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.entity.RefreshToken;
import com.xp77.os.auth.repository.RefreshTokenRepository;
import com.xp77.os.auth.service.OpaqueTokens;
import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenServiceTest extends PostgresTestBase {

    @Autowired
    private RefreshTokenService sessions;

    @Autowired
    private RefreshTokenRepository repository;

    private UUID newUser() {
        return TestData.createUser(TestData.uniqueEmail("sessao"), null);
    }

    private String issue(UUID user) {
        return sessions.issue(user, RootOrganization.ID, Origin.UNKNOWN);
    }

    private RefreshToken stored(String value) {
        return repository.findByTokenHash(OpaqueTokens.sha256Hex(value)).orElseThrow();
    }

    @Test
    void onlyTheHashIsStored() {
        String value = issue(newUser());

        assertThat(value).hasSize(43);
        assertThat(repository.findByTokenHash(value)).isEmpty();
        assertThat(repository.findByTokenHash(OpaqueTokens.sha256Hex(value))).isPresent();
    }

    @Test
    void rotationKeepsUserOrganizationAndFamilyAndLinksTheSuccessor() {
        UUID user = newUser();
        String first = issue(user);

        Rotation rotation = sessions.rotate(first, Origin.UNKNOWN).orElseThrow();

        assertThat(rotation.userId()).isEqualTo(user);
        assertThat(rotation.orgId()).isEqualTo(RootOrganization.ID);
        assertThat(rotation.email()).endsWith("@teste.77xp.dev");
        assertThat(rotation.newValue()).isNotEqualTo(first);
        RefreshToken old = stored(first);
        RefreshToken successor = stored(rotation.newValue());
        assertThat(old.getReplacedBy()).isEqualTo(successor.getId());
        assertThat(old.getRevokedAt()).isNotNull();
        assertThat(successor.getFamilyId()).isEqualTo(old.getFamilyId());
    }

    @Test
    void reusingARotatedTokenRevokesEverySessionOfTheUser() {
        UUID user = newUser();
        String t1 = issue(user);
        String t2 = sessions.rotate(t1, Origin.UNKNOWN).orElseThrow().newValue();
        String t3 = sessions.rotate(t2, Origin.UNKNOWN).orElseThrow().newValue();
        String otherDevice = issue(user);

        // t1 reapareceu: alguém tem uma cópia. Tudo do usuário cai, inclusive o que valia.
        assertThat(sessions.rotate(t1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(t3, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(otherDevice, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void unknownBlankOrNullTokensAreRejectedWithoutThrowing() {
        assertThat(sessions.rotate("valor-que-nunca-existiu", Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate("", Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(null, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void blockedUserCannotRotate() {
        UUID user = newUser();
        String value = issue(user);
        ownerJdbc().update("update users set status = 'BLOCKED' where id = ?", user);

        assertThat(sessions.rotate(value, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void expiredTokenIsRejected() {
        String value = issue(newUser());
        ownerJdbc().update("update refresh_tokens set expires_at = now() - interval '1 minute' where token_hash = ?",
                OpaqueTokens.sha256Hex(value));

        assertThat(sessions.rotate(value, Origin.UNKNOWN)).isEmpty();
    }

    @Test
    void revokeEndsOnlyThatSessionAndReturnsItsOwner() {
        UUID user = newUser();
        String tab1 = issue(user);
        String tab2 = issue(user);

        assertThat(sessions.revoke(tab1)).contains(user);
        assertThat(sessions.rotate(tab1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(tab2, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.revoke("desconhecido")).isEmpty();
    }

    @Test
    void revokeAllEndsEverySessionOfOnlyThatUser() {
        UUID a = newUser();
        UUID b = newUser();
        String a1 = issue(a);
        String a2 = issue(a);
        String b1 = issue(b);

        sessions.revokeAll(a);

        assertThat(sessions.rotate(a1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(a2, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(b1, Origin.UNKNOWN)).map(Rotation::userId).contains(b);
    }

    @Test
    void aNewDeviceBeyondTheLimitEndsTheOldestSession() {
        UUID user = newUser();
        String s1 = issue(user);
        String s2 = issue(user);
        String s3 = issue(user);
        String s4 = issue(user);

        assertThat(sessions.rotate(s1, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(s2, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.rotate(s3, Origin.UNKNOWN)).isPresent();
        assertThat(sessions.rotate(s4, Origin.UNKNOWN)).isPresent();
    }

    @Test
    void sessionRecordsWhereItCameFrom() {
        UUID user = newUser();
        String value = sessions.issue(user, RootOrganization.ID, new Origin("203.0.113.9", "Navegador/" + "x".repeat(500)));

        assertThat(stored(value).getIp()).isEqualTo("203.0.113.9");
        assertThat(stored(value).getUserAgent()).hasSize(400);

        String next = sessions.rotate(value, new Origin("198.51.100.4", "Outro aparelho")).orElseThrow().newValue();
        assertThat(stored(next).getIp()).isEqualTo("198.51.100.4");
        assertThat(stored(next).getUserAgent()).isEqualTo("Outro aparelho");
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OpaqueTokensTest,RefreshCookiesTest,RefreshTokenServiceTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.auth.service does not exist`.

- [ ] **Passo 3: Escrever a migração V5**

`os/backend/src/main/resources/db/migration/V5__session_tokens.sql`:

```sql
-- V5: tokens de sessão e de definição de senha.
--
-- Nenhum valor de token é guardado em claro: só o SHA-256. Ficam ligados à pessoa
-- (identidade global), sem RLS de organização. A sessão guarda a organização em
-- que nasceu, usada para emitir o novo access token na renovação.

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    org_id      UUID NOT NULL REFERENCES organizations (id),
    -- Cadeia de rotações de um mesmo login (um aparelho).
    family_id   UUID NOT NULL,
    token_hash  TEXT NOT NULL,
    issued_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    replaced_by UUID REFERENCES refresh_tokens (id),
    user_agent  TEXT,
    ip          TEXT,
    CONSTRAINT refresh_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_family_id_idx ON refresh_tokens (family_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);

-- Primeiro acesso e redefinição de senha: o mesmo mecanismo com finalidade e prazo diferentes.
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    purpose    TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT password_reset_tokens_hash_unique UNIQUE (token_hash),
    CONSTRAINT password_reset_tokens_purpose_check CHECK (purpose IN ('FIRST_ACCESS', 'RESET'))
);

CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);
```

- [ ] **Passo 4: Escrever entidade, repositório e serviços**

`os/backend/src/main/java/com/xp77/os/auth/entity/RefreshToken.java`:

```java
package com.xp77.os.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    private static final int MAX_USER_AGENT = 400;

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "family_id", nullable = false)
    private UUID familyId;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Column(name = "issued_at", insertable = false, updatable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by")
    private UUID replacedBy;

    @Column(name = "user_agent")
    private String userAgent;

    private String ip;

    protected RefreshToken() {
    }

    public RefreshToken(UUID userId, UUID orgId, UUID familyId, String tokenHash, Instant expiresAt,
                        String ip, String userAgent) {
        this.userId = userId;
        this.orgId = orgId;
        this.familyId = familyId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.ip = ip;
        this.userAgent = userAgent == null ? null
                : userAgent.substring(0, Math.min(userAgent.length(), MAX_USER_AGENT));
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public UUID getFamilyId() {
        return familyId;
    }

    public Instant getIssuedAt() {
        return issuedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public UUID getReplacedBy() {
        return replacedBy;
    }

    public String getIp() {
        return ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void revoke() {
        if (revokedAt == null) {
            revokedAt = Instant.now();
        }
    }

    public void markReplacedBy(UUID successorId) {
        this.replacedBy = successorId;
    }

    /** Já gerou um sucessor: aparecer de novo é sinal de cópia. */
    public boolean wasRotated() {
        return replacedBy != null;
    }

    public boolean isActive() {
        return revokedAt == null && Instant.now().isBefore(expiresAt);
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/repository/RefreshTokenRepository.java`:

```java
package com.xp77.os.auth.repository;

import com.xp77.os.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Sessões vigentes, da mais antiga para a mais nova: a ordem em que o limite derruba. */
    @Query("""
           SELECT t FROM RefreshToken t
            WHERE t.userId = :userId
              AND t.revokedAt IS NULL
              AND t.expiresAt > CURRENT_TIMESTAMP
            ORDER BY t.issuedAt ASC
           """)
    List<RefreshToken> findActiveByUser(@Param("userId") UUID userId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE RefreshToken t SET t.revokedAt = :now WHERE t.userId = :userId AND t.revokedAt IS NULL")
    int revokeAllActive(@Param("userId") UUID userId, @Param("now") Instant now);
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/OpaqueTokens.java`:

```java
package com.xp77.os.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Tokens opacos (refresh, primeiro acesso, redefinição): 256 bits de SecureRandom.
 * SHA-256 basta para guardá-los — com essa entropia não há força bruta nem
 * dicionário, ao contrário de uma senha escolhida por gente, que exige Argon2.
 */
public final class OpaqueTokens {

    private static final int BYTES = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private OpaqueTokens() {
    }

    public static String newValue() {
        byte[] bytes = new byte[BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public static String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/RefreshTokenService.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.auth.entity.RefreshToken;
import com.xp77.os.auth.repository.RefreshTokenRepository;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);

    /** De onde a sessão nasceu (IP confiável e aparelho). */
    public record Origin(String ip, String userAgent) {
        public static final Origin UNKNOWN = new Origin(null, null);
    }

    public record Rotation(UUID userId, UUID orgId, String email, String newValue) {
    }

    private final RefreshTokenRepository tokens;
    private final UserDirectory users;
    private final Duration lifetime;
    private final int maxActiveSessions;

    public RefreshTokenService(RefreshTokenRepository tokens,
                               UserDirectory users,
                               @Value("${xp77.auth.refresh-token-days}") long days,
                               @Value("${xp77.auth.max-active-sessions}") int maxActiveSessions) {
        this.tokens = tokens;
        this.users = users;
        this.lifetime = Duration.ofDays(days);
        this.maxActiveSessions = maxActiveSessions;
    }

    /**
     * Abre uma sessão nova (um aparelho). Acima do limite, a mais antiga cai antes de
     * gravar a nova: derrubar é melhor que recusar quem trocou de aparelho.
     */
    @Transactional
    public String issue(UUID userId, UUID orgId, Origin origin) {
        enforceSessionLimit(userId);
        String value = OpaqueTokens.newValue();
        tokens.saveAndFlush(new RefreshToken(userId, orgId, UUID.randomUUID(),
                OpaqueTokens.sha256Hex(value), Instant.now().plus(lifetime), origin.ip(), origin.userAgent()));
        return value;
    }

    /**
     * Troca um refresh token por outro. Vazio quando o token é desconhecido, expirado,
     * revogado ou de pessoa bloqueada — ou quando já foi trocado antes: nesse caso é
     * cópia, e todas as sessões da pessoa caem.
     */
    @Transactional
    public Optional<Rotation> rotate(String value, Origin origin) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        Optional<RefreshToken> found = tokens.findByTokenHash(OpaqueTokens.sha256Hex(value));
        if (found.isEmpty()) {
            return Optional.empty();
        }
        RefreshToken current = found.get();

        if (current.wasRotated()) {
            log.warn("Reuso de refresh token detectado para o usuário {}; todas as sessões foram revogadas",
                    current.getUserId());
            tokens.revokeAllActive(current.getUserId(), Instant.now());
            return Optional.empty();
        }
        if (!current.isActive()) {
            return Optional.empty();
        }
        Optional<UserAccount> owner = users.findActiveById(current.getUserId());
        if (owner.isEmpty()) {
            return Optional.empty();
        }

        String newValue = OpaqueTokens.newValue();
        RefreshToken successor = tokens.saveAndFlush(new RefreshToken(current.getUserId(), current.getOrgId(),
                current.getFamilyId(), OpaqueTokens.sha256Hex(newValue), Instant.now().plus(lifetime),
                origin.ip(), origin.userAgent()));
        current.revoke();
        current.markReplacedBy(successor.getId());
        tokens.saveAndFlush(current);

        return Optional.of(new Rotation(current.getUserId(), current.getOrgId(), owner.get().email(), newValue));
    }

    /** Encerra uma sessão (sair). Devolve o dono, quando o token existe. */
    @Transactional
    public Optional<UUID> revoke(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        return tokens.findByTokenHash(OpaqueTokens.sha256Hex(value)).map(token -> {
            token.revoke();
            tokens.saveAndFlush(token);
            return token.getUserId();
        });
    }

    @Transactional
    public void revokeAll(UUID userId) {
        tokens.revokeAllActive(userId, Instant.now());
    }

    private void enforceSessionLimit(UUID userId) {
        List<RefreshToken> active = tokens.findActiveByUser(userId);
        int excess = active.size() - (maxActiveSessions - 1);
        for (int i = 0; i < excess; i++) {
            RefreshToken oldest = active.get(i);
            oldest.revoke();
            tokens.save(oldest);
            log.info("Sessão mais antiga do usuário {} encerrada pelo limite de {} sessões.", userId, maxActiveSessions);
        }
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/RefreshCookies.java`:

```java
package com.xp77.os.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cookie do refresh token. HttpOnly: JavaScript nunca lê o valor (XSS não rouba a
 * sessão longa). Path /api/v1/auth: o navegador só o manda às rotas de login.
 * SameSite=Lax funciona porque tela e API ficam no mesmo site (rewrite da Vercel).
 */
@Component
public class RefreshCookies {

    public static final String NAME = "xp_refresh";
    public static final String PATH = "/api/v1/auth";

    private final boolean secure;
    private final String sameSite;
    private final Duration maxAge;

    public RefreshCookies(@Value("${xp77.auth.cookie-secure}") boolean secure,
                          @Value("${xp77.auth.cookie-same-site}") String sameSite,
                          @Value("${xp77.auth.refresh-token-days}") long days) {
        this.secure = secure;
        this.sameSite = sameSite;
        this.maxAge = Duration.ofDays(days);
    }

    public ResponseCookie issue(String value) {
        return builder(value).maxAge(maxAge).build();
    }

    public ResponseCookie clear() {
        return builder("").maxAge(Duration.ZERO).build();
    }

    private ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite(sameSite).path(PATH);
    }
}
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OpaqueTokensTest,RefreshCookiesTest,RefreshTokenServiceTest' test`
Expected: código de saída 0, `Tests run: 14, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 6: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 7: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources os/backend/src/main/java/com/xp77/os/auth os/backend/src/test/java/com/xp77/os/auth
git commit -m "feat(auth): add rotating refresh-token sessions with reuse detection and session limit" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 9: Endpoints de login, renovação, saída, `me` e troca de senha

**Arquivos:**
- Modify: `os/backend/src/main/resources/application.yml` (`xp77.rate-limit.trusted-proxy-hops`)
- Create: `os/backend/src/main/java/com/xp77/os/security/ClientIpResolver.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/dto/LoginRequest.java`, `auth/dto/TokenResponse.java`, `auth/dto/MeResponse.java`, `auth/dto/ChangePasswordRequest.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/service/AuthService.java`, `auth/controller/AuthController.java`
- Create (apoio de teste): `os/backend/src/test/java/com/xp77/os/support/TestAuth.java`
- Test: `os/backend/src/test/java/com/xp77/os/security/ClientIpResolverTest.java`, `os/backend/src/test/java/com/xp77/os/auth/AuthEndpointsTest.java`

**Interfaces:**
- Consumes: `UserDirectory`, `MembershipDirectory` (`activeRoleOf`, `recordLogin`) (Tarefa 6); `JwtService`, `AuthenticatedUser` (Tarefa 7); `RefreshTokenService`, `RefreshCookies` (Tarefa 8); `OrgContext`, `RootOrganization` (Tarefa 5).
- Produces:
  - `ClientIpResolver` (`@Component`) — `ClientIpResolver(int trustedProxyHops)`, `String resolve(HttpServletRequest request)`; propriedade `xp77.rate-limit.trusted-proxy-hops` (padrão 1).
  - `AuthService` — `record IssuedTokens(String accessToken, String refreshToken, long expiresInSeconds)`, `IssuedTokens login(String email, String password, RefreshTokenService.Origin origin)`, `IssuedTokens refresh(String refreshValue, RefreshTokenService.Origin origin)`, `void logout(String refreshValue)`, `UserAccount currentAccount(AuthenticatedUser user)`, `void changePassword(AuthenticatedUser user, String currentPassword, String newPassword)`; constantes `INVALID_CREDENTIALS = "E-mail ou senha inválidos."` e `INVALID_SESSION = "Sessão inválida ou expirada"`.
  - Rotas (context path `/api/v1`): `POST /auth/login` → 200 `ApiResponse<TokenResponse>` + cookie; `POST /auth/refresh` → 200 + cookie novo; `POST /auth/logout` → 204 + cookie limpo; `GET /auth/me` → 200 `ApiResponse<MeResponse>`; `POST /auth/change-password` → 204 + cookie limpo.
  - `record TokenResponse(String accessToken, long expiresIn, String tokenType)`; `record MeResponse(UUID id, String email, String name, UUID orgId, String role)` — o frontend (plano 2) usa `role` para mandar `CLIENT` a `/minha-conta` e os demais a `/painel`.
  - `TestAuth` (apoio de teste): `PASSWORD = "senha-forte-123"`, `UUID rootMember(String email, String role)`, `String loginBody(String email, String password)`, `MvcResult login(MockMvc, String email, String password)`, `String accessToken(MockMvc, String email)`, `Cookie refreshCookie(MockMvc, String email)`.

Regras (spec e D10): o login resolve a organização pelo domínio (o `OrgContextFilter` já pôs no `OrgContext`), exige pessoa ativa com senha **e** vínculo `ACTIVE` naquela organização, responde sempre a mesma mensagem genérica em qualquer falha e atualiza `memberships.last_login_at`. A renovação confere de novo o vínculo na organização da sessão (tipo de conta mudou ou vínculo bloqueado → 401). O IP da sessão vem do `ClientIpResolver`, nunca do primeiro valor do `X-Forwarded-For`.

- [ ] **Passo 1: Escrever o teste do IP confiável (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/security/ClientIpResolverTest.java`:

```java
package com.xp77.os.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ClientIpResolverTest {

    private static MockHttpServletRequest request(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void withOneTrustedProxyTheAddressItRecordedIsTheClientAndForgedValuesAreIgnored() {
        // O cliente mandou "203.0.113.9" forjado; o proxy confiável acrescentou o IP real.
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.1", "203.0.113.9, 198.51.100.7")))
                .isEqualTo("198.51.100.7");
    }

    @Test
    void withoutForwardedHeaderTheConnectionAddressIsUsed() {
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.2", null))).isEqualTo("10.0.0.2");
    }

    @Test
    void zeroTrustedProxiesAlwaysUsesTheConnectionAddress() {
        assertThat(new ClientIpResolver(0).resolve(request("10.0.0.3", "203.0.113.9"))).isEqualTo("10.0.0.3");
    }

    @Test
    void twoTrustedProxiesSkipTheirOwnEntries() {
        assertThat(new ClientIpResolver(2).resolve(request("10.0.0.1", "203.0.113.9, 198.51.100.7")))
                .isEqualTo("203.0.113.9");
    }

    @Test
    void valueThatIsNotAnIpFallsBackToTheConnectionAddress() {
        assertThat(new ClientIpResolver(1).resolve(request("10.0.0.4", "x".repeat(500)))).isEqualTo("10.0.0.4");
    }

    @Test
    void negativeHopsAreRejected() {
        assertThatThrownBy(() -> new ClientIpResolver(-1)).isInstanceOf(IllegalArgumentException.class);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=ClientIpResolverTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class ClientIpResolver`.

- [ ] **Passo 2: Escrever `ClientIpResolver` e a propriedade**

Em `os/backend/src/main/resources/application.yml`, trocar

```yaml
    cookie-same-site: Lax
```

por

```yaml
    cookie-same-site: Lax
  rate-limit:
    # Quantos proxies confiáveis ficam na frente da API (Render = 1). O IP do cliente
    # é o endereço que o último proxy confiável registrou no X-Forwarded-For.
    # Conferir no plano 3 o que o Render garante e ajustar aqui se preciso.
    trusted-proxy-hops: 1
```

`os/backend/src/main/java/com/xp77/os/security/ClientIpResolver.java`:

```java
package com.xp77.os.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * O IP de quem fez a requisição, escolhido de forma que o cliente não consiga forjar.
 *
 * <p>Cada proxy ACRESCENTA ao X-Forwarded-For o endereço de quem falou com ele; o que
 * vem antes pode ter sido escrito pelo próprio cliente. Com N proxies confiáveis na
 * frente da API, o cliente é o N-ésimo endereço contado da direita (a conexão direta
 * conta como o último). O Beto_Banco usava o PRIMEIRO valor, que qualquer um forja
 * chamando o Render direto.
 */
@Component
public class ClientIpResolver {

    /** IPv4 ou IPv6 em texto. O que não parece IP não vira chave. */
    private static final Pattern IP = Pattern.compile("^[0-9a-fA-F:.]{2,45}$");

    private final int trustedProxyHops;

    public ClientIpResolver(@Value("${xp77.rate-limit.trusted-proxy-hops}") int trustedProxyHops) {
        if (trustedProxyHops < 0) {
            throw new IllegalArgumentException("xp77.rate-limit.trusted-proxy-hops não pode ser negativo");
        }
        this.trustedProxyHops = trustedProxyHops;
    }

    public String resolve(HttpServletRequest request) {
        List<String> chain = new ArrayList<>();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null) {
            for (String part : forwardedFor.split(",")) {
                String address = part.trim();
                if (!address.isEmpty()) {
                    chain.add(address);
                }
            }
        }
        chain.add(request.getRemoteAddr());
        String candidate = chain.get(Math.max(0, chain.size() - 1 - trustedProxyHops));
        return IP.matcher(candidate).matches() ? candidate : request.getRemoteAddr();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=ClientIpResolverTest test`
Expected: código de saída 0, `Tests run: 6, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 3: Escrever o apoio `TestAuth` e o teste dos endpoints (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/support/TestAuth.java`:

```java
package com.xp77.os.support;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.auth.service.RefreshCookies;
import com.xp77.os.organizations.api.RootOrganization;
import jakarta.servlet.http.Cookie;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Cria contas na organização raiz e entra por /auth/login, como o navegador faria. */
public final class TestAuth {

    public static final String PASSWORD = "senha-forte-123";

    private TestAuth() {
    }

    /** Pessoa com senha e vínculo ativo na 77xp (o MockMvc usa o host localhost → raiz). */
    public static UUID rootMember(String email, String role) {
        UUID user = TestData.createUser(email, TestData.hash(PASSWORD));
        TestData.addMembership(user, RootOrganization.ID, role);
        return user;
    }

    public static String loginBody(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    public static MvcResult login(MockMvc mockMvc, String email, String password) throws Exception {
        return mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody(email, password)))
                .andReturn();
    }

    public static String accessToken(MockMvc mockMvc, String email) throws Exception {
        MvcResult result = login(mockMvc, email, PASSWORD);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return JsonPath.read(result.getResponse().getContentAsString(), "$.data.accessToken");
    }

    public static Cookie refreshCookie(MockMvc mockMvc, String email) throws Exception {
        MvcResult result = login(mockMvc, email, PASSWORD);
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return result.getResponse().getCookie(RefreshCookies.NAME);
    }
}
```

`os/backend/src/test/java/com/xp77/os/auth/AuthEndpointsTest.java`:

```java
package com.xp77.os.auth;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AuthEndpointsTest extends PostgresTestBase {

    private static final String GENERIC = "E-mail ou senha inválidos.";

    @Autowired
    private MockMvc mockMvc;

    private String member(String prefix, String role) {
        String email = TestData.uniqueEmail(prefix);
        TestAuth.rootMember(email, role);
        return email;
    }

    private void blockMembership(String email) {
        ownerJdbc().update("update memberships set status = 'BLOCKED' where org_id = ? "
                + "and user_id = (select id from users where email = ?)", RootOrganization.ID, email);
    }

    private void expectGenericFailure(String email, String password) throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(TestAuth.loginBody(email, password)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.message").value(GENERIC));
    }

    @Test
    void validLoginReturnsAccessTokenInTheBodyAndRefreshOnlyInTheCookie() throws Exception {
        MvcResult result = TestAuth.login(mockMvc, member("ok", "OWNER"), TestAuth.PASSWORD);

        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        String body = result.getResponse().getContentAsString();
        assertThat(JsonPath.<String>read(body, "$.data.accessToken")).isNotBlank();
        assertThat(JsonPath.<Integer>read(body, "$.data.expiresIn")).isEqualTo(900);
        assertThat(JsonPath.<String>read(body, "$.data.tokenType")).isEqualTo("Bearer");
        Cookie cookie = result.getResponse().getCookie("xp_refresh");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(body).doesNotContain("refreshToken").doesNotContain(cookie.getValue());
    }

    @Test
    void wrongPasswordUnknownEmailAndNoMembershipGetTheSameAnswer() throws Exception {
        String email = member("errada", "TEAM");
        String outsider = TestData.uniqueEmail("sem-vinculo");
        TestData.createUser(outsider, TestData.hash(TestAuth.PASSWORD));

        expectGenericFailure(email, "outra-senha");
        expectGenericFailure(TestData.uniqueEmail("ninguem"), TestAuth.PASSWORD);
        expectGenericFailure(outsider, TestAuth.PASSWORD);
    }

    @Test
    void blockedPersonOrBlockedMembershipCannotLogIn() throws Exception {
        String blockedPerson = member("pessoa-bloqueada", "TEAM");
        ownerJdbc().update("update users set status = 'BLOCKED' where email = ?", blockedPerson);
        String blockedMembership = member("vinculo-bloqueado", "CLIENT");
        blockMembership(blockedMembership);

        expectGenericFailure(blockedPerson, TestAuth.PASSWORD);
        expectGenericFailure(blockedMembership, TestAuth.PASSWORD);
    }

    @Test
    void loginIgnoresEmailCaseAndRecordsTheLastAccess() throws Exception {
        String email = member("caixa", "ADMIN");

        assertThat(TestAuth.login(mockMvc, email.toUpperCase(), TestAuth.PASSWORD).getResponse().getStatus())
                .isEqualTo(200);
        assertThat(ownerJdbc().queryForObject("select m.last_login_at is not null from memberships m "
                        + "join users u on u.id = m.user_id where u.email = ?", Boolean.class, email)).isTrue();
    }

    @Test
    void invalidBodyReturns422() throws Exception {
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    void meReturnsTheIdentityFromTheTokenWithoutPasswordData() throws Exception {
        String email = member("eu", "OWNER");
        ownerJdbc().update("update users set name = 'Dono da 77xp' where email = ?", email);

        String body = mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.name").value("Dono da 77xp"))
                .andExpect(jsonPath("$.data.orgId").value(RootOrganization.ID.toString()))
                .andExpect(jsonPath("$.data.role").value("OWNER"))
                .andReturn().getResponse().getContentAsString();

        assertThat(body).doesNotContain("argon2").doesNotContain("passwordHash");
    }

    @Test
    void meRejectsATokenWhoseMembershipWasBlocked() throws Exception {
        String email = member("me-bloqueado", "TEAM");
        String token = TestAuth.accessToken(mockMvc, email);
        blockMembership(email);

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesTheCookieAndTheOldOneStopsWorking() throws Exception {
        Cookie first = TestAuth.refreshCookie(mockMvc, member("renova", "TEAM"));

        MvcResult renewed = mockMvc.perform(post("/auth/refresh").cookie(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();
        Cookie second = renewed.getResponse().getCookie("xp_refresh");

        assertThat(second.getValue()).isNotEqualTo(first.getValue());
        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());
    }

    @Test
    void reusingARotatedRefreshTokenEndsEverySession() throws Exception {
        Cookie t1 = TestAuth.refreshCookie(mockMvc, member("roubo", "TEAM"));
        Cookie t2 = mockMvc.perform(post("/auth/refresh").cookie(t1)).andReturn().getResponse().getCookie("xp_refresh");

        mockMvc.perform(post("/auth/refresh").cookie(t1)).andExpect(status().isUnauthorized());
        // t2 era legítimo e cai junto: é o preço de conter uma cópia do token.
        mockMvc.perform(post("/auth/refresh").cookie(t2)).andExpect(status().isUnauthorized());
    }

    @Test
    void refreshFailsWhenTheMembershipWasBlocked() throws Exception {
        String email = member("renova-bloqueado", "CLIENT");
        Cookie cookie = TestAuth.refreshCookie(mockMvc, email);
        blockMembership(email);

        mockMvc.perform(post("/auth/refresh").cookie(cookie)).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutEndsOnlyThatSessionClearsTheCookieAndAlwaysReturns204() throws Exception {
        String email = member("sair", "TEAM");
        Cookie tab1 = TestAuth.refreshCookie(mockMvc, email);
        Cookie tab2 = TestAuth.refreshCookie(mockMvc, email);

        MvcResult logout = mockMvc.perform(post("/auth/logout").cookie(tab1))
                .andExpect(status().isNoContent()).andReturn();

        assertThat(logout.getResponse().getCookie("xp_refresh").getMaxAge()).isZero();
        mockMvc.perform(post("/auth/refresh").cookie(tab1)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/auth/refresh").cookie(tab2)).andExpect(status().isOk());
        // Token desconhecido também dá 204: 404 revelaria quais existem.
        mockMvc.perform(post("/auth/logout").cookie(new Cookie("xp_refresh", "qualquer")))
                .andExpect(status().isNoContent());
    }

    @Test
    void refreshWithoutCookieReturns401() throws Exception {
        mockMvc.perform(post("/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordChecksTheCurrentPasswordAndEndsEverySession() throws Exception {
        String email = member("troca", "ADMIN");
        MvcResult login = TestAuth.login(mockMvc, email, TestAuth.PASSWORD);
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
        Cookie refresh = login.getResponse().getCookie("xp_refresh");

        mockMvc.perform(post("/auth/change-password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"errada-123\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message").value("Senha atual incorreta."));

        MvcResult changed = mockMvc.perform(post("/auth/change-password").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + TestAuth.PASSWORD + "\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isNoContent()).andReturn();

        assertThat(changed.getResponse().getCookie("xp_refresh").getMaxAge()).isZero();
        mockMvc.perform(post("/auth/refresh").cookie(refresh)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, "nova-senha-456").getResponse().getStatus()).isEqualTo(200);
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(401);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=AuthEndpointsTest test`
Expected: código de saída 1, `BUILD FAILURE`, `Tests run: 13, Failures: 13` (ou erros): sem controller, `/auth/login` responde 404/405 e `/auth/me` responde 401 — nenhum teste passa.

- [ ] **Passo 4: Escrever os DTOs**

`os/backend/src/main/java/com/xp77/os/auth/dto/LoginRequest.java`:

```java
package com.xp77.os.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Informe o e-mail")
        @Email(message = "E-mail inválido")
        String email,

        @NotBlank(message = "Informe a senha")
        String password) {
}
```

`os/backend/src/main/java/com/xp77/os/auth/dto/TokenResponse.java`:

```java
package com.xp77.os.auth.dto;

/** Só o access token vai no JSON; o refresh token viaja apenas no cookie HttpOnly. */
public record TokenResponse(String accessToken, long expiresIn, String tokenType) {

    public static TokenResponse bearer(String accessToken, long expiresIn) {
        return new TokenResponse(accessToken, expiresIn, "Bearer");
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/dto/MeResponse.java`:

```java
package com.xp77.os.auth.dto;

import java.util.UUID;

/** Quem está logado e em qual organização, com o tipo de conta (OWNER, ADMIN, TEAM ou CLIENT). */
public record MeResponse(UUID id, String email, String name, UUID orgId, String role) {
}
```

`os/backend/src/main/java/com/xp77/os/auth/dto/ChangePasswordRequest.java`:

```java
package com.xp77.os.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A senha atual é exigida mesmo com sessão válida: sessão aberta prova que a pessoa
 * entrou em algum momento, não que é ela quem está no teclado agora.
 */
public record ChangePasswordRequest(
        @NotBlank(message = "Informe sua senha atual")
        String currentPassword,

        @NotBlank(message = "Informe a nova senha")
        @Size(min = 8, message = "A nova senha precisa ter ao menos 8 caracteres")
        String newPassword) {
}
```

- [ ] **Passo 5: Escrever `AuthService` e `AuthController`**

`os/backend/src/main/java/com/xp77/os/auth/service/AuthService.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.JwtService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Orquestra login, renovação, saída e troca de senha. Sem @Transactional aqui de
 * propósito: cada chamada aos diretórios e às sessões abre a própria transação, e a
 * renovação precisa trocar de organização (OrgContext.callAs) entre uma e outra.
 */
@Service
public class AuthService {

    /** Mensagem única para qualquer falha: diferenciar os casos enumeraria contas. */
    public static final String INVALID_CREDENTIALS = "E-mail ou senha inválidos.";
    public static final String INVALID_SESSION = "Sessão inválida ou expirada";

    public record IssuedTokens(String accessToken, String refreshToken, long expiresInSeconds) {
    }

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwt;

    public AuthService(UserDirectory users, MembershipDirectory memberships,
                       RefreshTokenService refreshTokens, JwtService jwt) {
        this.users = users;
        this.memberships = memberships;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
    }

    /** Organização = a do domínio da requisição (OrgContextFilter). */
    public IssuedTokens login(String email, String password, Origin origin) {
        UUID orgId = OrgContext.current()
                .orElseThrow(() -> new IllegalStateException("Login sem organização no contexto"));
        Optional<UserAccount> account = users.verifyCredentials(email, password);
        Optional<MembershipRole> role = account.flatMap(a -> memberships.activeRoleOf(a.id(), orgId));
        if (role.isEmpty()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        UserAccount user = account.get();
        memberships.recordLogin(user.id(), orgId);
        String refresh = refreshTokens.issue(user.id(), orgId, origin);
        return new IssuedTokens(jwt.generate(user.id(), orgId, user.email(), role.get().name()),
                refresh, jwt.lifetimeSeconds());
    }

    /** O tipo de conta é relido na organização da sessão: vínculo bloqueado não renova. */
    public IssuedTokens refresh(String refreshValue, Origin origin) {
        Rotation rotation = refreshTokens.rotate(refreshValue, origin).orElseThrow(AuthService::invalidSession);
        Optional<MembershipRole> role = OrgContext.callAs(rotation.orgId(),
                () -> memberships.activeRoleOf(rotation.userId(), rotation.orgId()));
        if (role.isEmpty()) {
            refreshTokens.revoke(rotation.newValue());
            throw invalidSession();
        }
        return new IssuedTokens(jwt.generate(rotation.userId(), rotation.orgId(), rotation.email(), role.get().name()),
                rotation.newValue(), jwt.lifetimeSeconds());
    }

    public void logout(String refreshValue) {
        refreshTokens.revoke(refreshValue);
    }

    /** A pessoa do token, se ainda estiver ativa e com vínculo ativo na organização do token. */
    public UserAccount currentAccount(AuthenticatedUser user) {
        if (memberships.activeRoleOf(user.userId(), user.orgId()).isEmpty()) {
            throw invalidSession();
        }
        return users.findActiveById(user.userId()).orElseThrow(AuthService::invalidSession);
    }

    /** O e-mail conferido vem do token, nunca do corpo. Todas as sessões caem depois. */
    public void changePassword(AuthenticatedUser user, String currentPassword, String newPassword) {
        users.verifyCredentials(user.email(), currentPassword)
                .filter(account -> account.id().equals(user.userId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "Senha atual incorreta."));
        users.setPassword(user.userId(), newPassword);
        refreshTokens.revokeAll(user.userId());
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_SESSION);
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/controller/AuthController.java`:

```java
package com.xp77.os.auth.controller;

import com.xp77.os.auth.dto.ChangePasswordRequest;
import com.xp77.os.auth.dto.LoginRequest;
import com.xp77.os.auth.dto.MeResponse;
import com.xp77.os.auth.dto.TokenResponse;
import com.xp77.os.auth.service.AuthService;
import com.xp77.os.auth.service.AuthService.IssuedTokens;
import com.xp77.os.auth.service.RefreshCookies;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.ClientIpResolver;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.users.api.UserAccount;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService auth;
    private final RefreshCookies cookies;
    private final ClientIpResolver clientIp;

    public AuthController(AuthService auth, RefreshCookies cookies, ClientIpResolver clientIp) {
        this.auth = auth;
        this.cookies = cookies;
        this.clientIp = clientIp;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request,
                                                            HttpServletRequest http) {
        return withSession(auth.login(request.email(), request.password(), originOf(http)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(
            @CookieValue(value = RefreshCookies.NAME, required = false) String refresh,
            HttpServletRequest http) {
        return withSession(auth.refresh(refresh, originOf(http)));
    }

    /** Sempre 204 e cookie limpo: responder 404 revelaria quais tokens existem. */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(value = RefreshCookies.NAME, required = false) String refresh) {
        auth.logout(refresh);
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MeResponse>> me(@AuthenticationPrincipal AuthenticatedUser user) {
        UserAccount account = auth.currentAccount(user);
        return ResponseEntity.ok(ApiResponse.ok(new MeResponse(
                account.id(), account.email(), account.name(), user.orgId(), user.role())));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@AuthenticationPrincipal AuthenticatedUser user,
                                               @Valid @RequestBody ChangePasswordRequest request) {
        auth.changePassword(user, request.currentPassword(), request.newPassword());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.clear().toString()).build();
    }

    private ResponseEntity<ApiResponse<TokenResponse>> withSession(IssuedTokens tokens) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(tokens.refreshToken()).toString())
                .body(ApiResponse.ok(TokenResponse.bearer(tokens.accessToken(), tokens.expiresInSeconds())));
    }

    private Origin originOf(HttpServletRequest request) {
        return new Origin(clientIp.resolve(request), request.getHeader(HttpHeaders.USER_AGENT));
    }
}
```

- [ ] **Passo 6: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='ClientIpResolverTest,AuthEndpointsTest' test`
Expected: código de saída 0, `Tests run: 19, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 7: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 8: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources/application.yml os/backend/src/main/java/com/xp77/os/security/ClientIpResolver.java os/backend/src/main/java/com/xp77/os/auth os/backend/src/test/java/com/xp77/os/support/TestAuth.java os/backend/src/test/java/com/xp77/os/security/ClientIpResolverTest.java os/backend/src/test/java/com/xp77/os/auth/AuthEndpointsTest.java
git commit -m "feat(auth): add login, refresh, logout, me and change-password endpoints" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 10: V7 e fila de e-mail (uma transação por mensagem, trava mantida durante o envio)

**Arquivos:**
- Modify: `os/backend/pom.xml` (`spring-boot-starter-mail`)
- Create: `os/backend/src/main/resources/db/migration/V7__email_outbox.sql`
- Create: `os/backend/src/main/java/com/xp77/os/email/api/EmailService.java`, `email/entity/EmailOutbox.java`, `email/repository/EmailOutboxRepository.java`
- Create: `os/backend/src/main/java/com/xp77/os/email/service/EmailOutboxService.java`, `email/service/EmailTemplates.java`, `email/service/EmailSender.java`, `email/service/SmtpEmailSender.java`, `email/service/EmailOutboxProcessor.java`, `email/service/EmailDispatcher.java`
- Create: `os/backend/src/main/java/com/xp77/os/config/SchedulingConfig.java`
- Modify: `os/backend/src/main/resources/application.yml`, `application-dev.yml`, `application-test.yml`, `application-prod.yml`
- Test: `os/backend/src/test/java/com/xp77/os/email/EmailOutboxTest.java`, `email/EmailTemplatesTest.java`, `email/EmailOutboxServiceTest.java`, `email/EmailDispatcherTest.java`, `email/SmtpEmailSenderMailpitTest.java`

**Interfaces:**
- Consumes: `OrgContext`, `RootOrganization` (Tarefa 5); `TestData`, `PostgresTestBase.ownerJdbc()`.
- Produces:
  - `interface EmailService` — `boolean enqueue(String to, String template, Map<String, Object> data, String dedupKey)` (grava na fila e devolve `true`; mesma `dedupKey` é ignorada e devolve `false`; exige `OrgContext`); `EmailService.Templates.PRIMEIRO_ACESSO`, `EmailService.Templates.REDEFINIR_SENHA` (a Tarefa 11 acrescenta `CONVITE`). Dados usados pelos templates: `token` (texto) e `validityHours` (número).
  - `EmailTemplates` — `record RenderedEmail(String subject, String body)`, `RenderedEmail render(String template, Map<String, Object> data)` (template desconhecido ou sem token → `IllegalArgumentException`); links `${APP_BASE_URL}/primeiro-acesso?token=…` e `${APP_BASE_URL}/redefinir-senha?token=…`.
  - `interface EmailSender` — `void send(String to, String subject, String body)`; implementação `SmtpEmailSender`.
  - `EmailOutboxProcessor` — `boolean processNext()` (`@Transactional`, uma mensagem); `EmailDispatcher` — `int dispatchBatch()` (até `xp77.email.batch-size` = 20) e `void tick()` (`@Scheduled` a cada `xp77.email.dispatch-interval-ms` = 15000).
  - `SchedulingConfig` (`@EnableScheduling`, só com `xp77.scheduling.enabled=true`; desligado no perfil `test`).
  - Propriedades: `xp77.email.from` (`MAIL_FROM`), `xp77.email.base-url` (`APP_BASE_URL`), `spring.mail.*` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`), `management.health.mail.enabled=false`.

Correções em relação ao Beto_Banco:
1. Uma transação **por mensagem**, aberta por outro bean (`EmailDispatcher` → `EmailOutboxProcessor.processNext`), com `FOR UPDATE SKIP LOCKED` na mesma transação do envio: a linha fica travada até o commit, então a outra instância que convive num deploy pula a mensagem em vez de reenviá-la (no Beto_Banco, o `WebhookProcessor` chamava `this.processarUm` e a trava caía logo depois da busca).
2. O backoff usa os cinco intervalos (1 min, 5 min, 30 min, 2 h, 12 h) e só depois marca `FAILED` — no Beto_Banco o de 12 h nunca era usado.
3. `dedupKey` repetida usa `INSERT … ON CONFLICT DO NOTHING`: no Beto_Banco a violação de unicidade era capturada dentro da transação de quem chamou, o que no PostgreSQL aborta a transação inteira (a de redefinição de senha, por exemplo).

- [ ] **Passo 1: Adicionar o starter de e-mail e a configuração**

Inserir no `os/backend/pom.xml` logo antes da linha `        <!-- Testes -->`:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
```

Em `os/backend/src/main/resources/application.yml`, trocar

```yaml
    health:
      probes:
        enabled: true
```

por

```yaml
    health:
      probes:
        enabled: true
  health:
    # SMTP fora do ar não derruba a saúde da aplicação: a fila tenta de novo com
    # backoff. Sem isto, o health check do Render mataria um processo saudável.
    mail:
      enabled: false
```

e trocar

```yaml
    trusted-proxy-hops: 1
```

por

```yaml
    trusted-proxy-hops: 1
  email:
    dispatch-interval-ms: 15000
    batch-size: 20
  scheduling:
    # Processos em segundo plano (fila de e-mail). Desligado nos testes, que chamam
    # o despacho diretamente.
    enabled: true
```

Em `os/backend/src/main/resources/application-dev.yml`, trocar

```yaml
  flyway:
    user: ${FLYWAY_USER:xp77}
    password: ${FLYWAY_PASSWORD:xp77}
```

por

```yaml
  flyway:
    user: ${FLYWAY_USER:xp77}
    password: ${FLYWAY_PASSWORD:xp77}
  mail:
    # Mailpit local (docker compose define SMTP_HOST=mailpit dentro da rede).
    host: ${SMTP_HOST:localhost}
    port: ${SMTP_PORT:1025}
    username: ${SMTP_USER:}
    password: ${SMTP_PASSWORD:}
```

e trocar

```yaml
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
```

por

```yaml
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173}
  email:
    from: ${MAIL_FROM:nao-responda@77xp.local}
    base-url: ${APP_BASE_URL:http://localhost:5173}
```

Em `os/backend/src/main/resources/application-test.yml`, trocar

```yaml
    allowed-origins: http://localhost:5173
```

por

```yaml
    allowed-origins: http://localhost:5173
  email:
    from: nao-responda@77xp.test
    base-url: http://localhost:5173
  scheduling:
    enabled: false
```

e acrescentar ao final do arquivo:

```yaml

spring:
  mail:
    # Nenhum SMTP roda nos testes; o SmtpEmailSenderMailpitTest sobe o próprio Mailpit.
    host: localhost
    port: 1025
```

Em `os/backend/src/main/resources/application-prod.yml`, trocar

```yaml
    password: ${FLYWAY_PASSWORD}
```

por

```yaml
    password: ${FLYWAY_PASSWORD}
  mail:
    # Resend por SMTP (porta 587 com STARTTLS).
    host: ${SMTP_HOST}
    port: ${SMTP_PORT}
    username: ${SMTP_USER}
    password: ${SMTP_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
```

e trocar

```yaml
    allowed-origins: ${CORS_ALLOWED_ORIGINS}
```

por

```yaml
    allowed-origins: ${CORS_ALLOWED_ORIGINS}
  email:
    from: ${MAIL_FROM}
    base-url: ${APP_BASE_URL}
```

- [ ] **Passo 2: Escrever os testes de unidade (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/email/EmailOutboxTest.java`:

```java
package com.xp77.os.email;

import com.xp77.os.email.entity.EmailOutbox;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EmailOutboxTest {

    private EmailOutbox message() {
        return new EmailOutbox(UUID.randomUUID(), "a@exemplo.com", "REDEFINIR_SENHA", "{}", "chave");
    }

    @Test
    void backoffIsOneFiveThirtyMinutesTwoAndTwelveHoursThenFailed() {
        EmailOutbox message = message();
        Instant now = Instant.parse("2026-09-18T12:00:00Z");
        List<Duration> expected = List.of(Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(30),
                Duration.ofHours(2), Duration.ofHours(12));

        for (int i = 0; i < expected.size(); i++) {
            message.registerFailure("smtp fora do ar", now);
            assertThat(message.getStatus()).isEqualTo(EmailOutbox.PENDING);
            assertThat(message.getAttempts()).isEqualTo(i + 1);
            assertThat(message.getNextAttemptAt()).isEqualTo(now.plus(expected.get(i)));
        }

        message.registerFailure("smtp fora do ar", now);
        assertThat(message.getStatus()).isEqualTo(EmailOutbox.FAILED);
        assertThat(message.getAttempts()).isEqualTo(6);
        assertThat(message.getErrorMessage()).isEqualTo("smtp fora do ar");
    }

    @Test
    void markSentRecordsTheMomentAndClearsTheError() {
        EmailOutbox message = message();
        message.registerFailure("falhou", Instant.now());
        Instant sentAt = Instant.parse("2026-09-18T12:05:00Z");

        message.markSent(sentAt);

        assertThat(message.getStatus()).isEqualTo(EmailOutbox.SENT);
        assertThat(message.getSentAt()).isEqualTo(sentAt);
        assertThat(message.getErrorMessage()).isNull();
    }
}
```

`os/backend/src/test/java/com/xp77/os/email/EmailTemplatesTest.java`:

```java
package com.xp77.os.email;

import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.service.EmailTemplates;
import com.xp77.os.email.service.EmailTemplates.RenderedEmail;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailTemplatesTest {

    private final EmailTemplates templates = new EmailTemplates("http://localhost:5173/");

    @Test
    void firstAccessEmailLinksToTheFirstAccessPage() {
        RenderedEmail email = templates.render(EmailService.Templates.PRIMEIRO_ACESSO,
                Map.of("token", "abc123", "validityHours", 72));

        assertThat(email.subject()).isEqualTo("Seu acesso ao painel da 77xp");
        assertThat(email.body()).contains("http://localhost:5173/primeiro-acesso?token=abc123").contains("72 horas");
    }

    @Test
    void resetEmailLinksToTheResetPage() {
        RenderedEmail email = templates.render(EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "xyz", "validityHours", 1));

        assertThat(email.subject()).isEqualTo("Redefinição de senha — 77xp");
        assertThat(email.body()).contains("http://localhost:5173/redefinir-senha?token=xyz")
                .contains("1 hora").doesNotContain("1 horas");
    }

    @Test
    void unknownTemplateOrMissingTokenIsRefused() {
        assertThatThrownBy(() -> templates.render("QUALQUER", Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> templates.render(EmailService.Templates.REDEFINIR_SENHA, Map.of("validityHours", 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='EmailOutboxTest,EmailTemplatesTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.email.entity does not exist`.

- [ ] **Passo 3: Escrever a V7, a entidade, a API e os templates**

`os/backend/src/main/resources/db/migration/V7__email_outbox.sql`:

```sql
-- V7: fila de e-mail (outbox). Fila do sistema, processada em segundo plano sem
-- organização no contexto: por isso não tem RLS. org_id fica como referência
-- (quem enfileirou), para relatório e para templates por organização no futuro.
CREATE TABLE email_outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations (id),
    to_address      TEXT NOT NULL,
    template        TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    dedup_key       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT email_outbox_status_check CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT email_outbox_attempts_check CHECK (attempts >= 0),
    CONSTRAINT email_outbox_dedup_key_unique UNIQUE (dedup_key)
);

CREATE INDEX email_outbox_pending_idx ON email_outbox (next_attempt_at) WHERE status = 'PENDING';
```

`os/backend/src/main/java/com/xp77/os/email/api/EmailService.java`:

```java
package com.xp77.os.email.api;

import java.util.Map;

/**
 * Contrato do módulo email. Enfileirar NÃO envia: grava na fila e volta. E-mail
 * enviado não tem rollback; por isso o envio acontece depois, fora da transação
 * de quem pediu. Exige OrgContext (a mensagem guarda a organização).
 */
public interface EmailService {

    /** @return true se enfileirou agora; false se a dedupKey já existia. */
    boolean enqueue(String to, String template, Map<String, Object> data, String dedupKey);

    /** Templates conhecidos. O texto de cada um vive em EmailTemplates. */
    final class Templates {
        public static final String PRIMEIRO_ACESSO = "PRIMEIRO_ACESSO";
        public static final String REDEFINIR_SENHA = "REDEFINIR_SENHA";

        private Templates() {
        }
    }
}
```

`os/backend/src/main/java/com/xp77/os/email/entity/EmailOutbox.java`:

```java
package com.xp77.os.email.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "email_outbox")
public class EmailOutbox {

    public static final String PENDING = "PENDING";
    public static final String SENT = "SENT";
    public static final String FAILED = "FAILED";

    /** Espera antes da 2ª, 3ª, 4ª, 5ª e 6ª tentativa. Falhou a 6ª: FAILED. */
    private static final List<Duration> BACKOFF = List.of(
            Duration.ofMinutes(1), Duration.ofMinutes(5), Duration.ofMinutes(30),
            Duration.ofHours(2), Duration.ofHours(12));

    private static final int MAX_ERROR = 1000;

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "to_address", nullable = false)
    private String toAddress;

    @Column(nullable = false)
    private String template;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String payload;

    @Column(nullable = false)
    private String status = PENDING;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "next_attempt_at", nullable = false)
    private Instant nextAttemptAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "dedup_key", nullable = false)
    private String dedupKey;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected EmailOutbox() {
    }

    public EmailOutbox(UUID orgId, String toAddress, String template, String payload, String dedupKey) {
        this.orgId = orgId;
        this.toAddress = toAddress;
        this.template = template;
        this.payload = payload;
        this.dedupKey = dedupKey;
    }

    public void markSent(Instant at) {
        this.status = SENT;
        this.sentAt = at;
        this.errorMessage = null;
    }

    public void registerFailure(String error, Instant now) {
        this.attempts++;
        this.errorMessage = error == null ? "erro desconhecido" : error.substring(0, Math.min(error.length(), MAX_ERROR));
        if (attempts > BACKOFF.size()) {
            this.status = FAILED;
        } else {
            this.status = PENDING;
            this.nextAttemptAt = now.plus(BACKOFF.get(attempts - 1));
        }
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public String getToAddress() {
        return toAddress;
    }

    public String getTemplate() {
        return template;
    }

    public String getPayload() {
        return payload;
    }

    public String getStatus() {
        return status;
    }

    public int getAttempts() {
        return attempts;
    }

    public Instant getNextAttemptAt() {
        return nextAttemptAt;
    }

    public Instant getSentAt() {
        return sentAt;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public String getDedupKey() {
        return dedupKey;
    }
}
```

`os/backend/src/main/java/com/xp77/os/email/service/EmailTemplates.java`:

```java
package com.xp77.os.email.service;

import com.xp77.os.email.api.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;

/** Assunto e corpo (texto simples, em português) de cada template. */
@Component
public class EmailTemplates {

    public record RenderedEmail(String subject, String body) {
    }

    private final String baseUrl;

    public EmailTemplates(@Value("${xp77.email.base-url}") String baseUrl) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    public RenderedEmail render(String template, Map<String, Object> data) {
        return switch (template) {
            case EmailService.Templates.PRIMEIRO_ACESSO -> new RenderedEmail("Seu acesso ao painel da 77xp", """
                    Olá!

                    Sua conta no painel da 77xp foi criada.

                    Crie sua senha neste link (válido por %s):
                    %s/primeiro-acesso?token=%s

                    Se você não esperava este e-mail, ignore esta mensagem.

                    Equipe 77xp""".formatted(validity(data), baseUrl, token(data)));
            case EmailService.Templates.REDEFINIR_SENHA -> new RenderedEmail("Redefinição de senha — 77xp", """
                    Olá!

                    Recebemos um pedido para redefinir a senha da sua conta na 77xp.

                    Use este link (válido por %s):
                    %s/redefinir-senha?token=%s

                    Se não foi você, ignore esta mensagem: sua senha continua a mesma.

                    Equipe 77xp""".formatted(validity(data), baseUrl, token(data)));
            default -> throw new IllegalArgumentException("Template de e-mail desconhecido: " + template);
        };
    }

    private static String token(Map<String, Object> data) {
        Object token = data.get("token");
        if (token == null || token.toString().isBlank()) {
            throw new IllegalArgumentException("E-mail sem token");
        }
        return token.toString();
    }

    private static String validity(Map<String, Object> data) {
        if (!(data.get("validityHours") instanceof Number hours)) {
            throw new IllegalArgumentException("E-mail sem validade do link");
        }
        return hours.longValue() == 1 ? "1 hora" : hours.longValue() + " horas";
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='EmailOutboxTest,EmailTemplatesTest' test`
Expected: código de saída 0, `Tests run: 5, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 4: Escrever os testes da fila com banco (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/email/EmailOutboxServiceTest.java`:

```java
package com.xp77.os.email;

import com.xp77.os.email.api.EmailService;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class EmailOutboxServiceTest extends PostgresTestBase {

    @Autowired
    private EmailService emails;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    void enqueueStoresAPendingMessageForTheCurrentOrganization() {
        UUID org = TestData.createOrg("Fila");
        String key = TestData.unique("fila");

        boolean enqueued = OrgContext.callAs(org, () -> emails.enqueue("pessoa@exemplo.com",
                EmailService.Templates.REDEFINIR_SENHA, Map.of("token", "t-1", "validityHours", 1), key));

        assertThat(enqueued).isTrue();
        Map<String, Object> row = ownerJdbc().queryForMap("select org_id, to_address, template, status, attempts, "
                + "payload->>'token' as token from email_outbox where dedup_key = ?", key);
        assertThat(row).containsEntry("org_id", org)
                .containsEntry("to_address", "pessoa@exemplo.com")
                .containsEntry("template", "REDEFINIR_SENHA")
                .containsEntry("status", "PENDING")
                .containsEntry("attempts", 0)
                .containsEntry("token", "t-1");
    }

    @Test
    void sameDedupKeyIsIgnoredWithoutBreakingTheCallersTransaction() {
        String key = TestData.unique("dedup");

        List<Boolean> results = OrgContext.callAs(RootOrganization.ID, () ->
                new TransactionTemplate(transactionManager).execute(status -> List.of(
                        emails.enqueue("a@exemplo.com", EmailService.Templates.PRIMEIRO_ACESSO,
                                Map.of("token", "1", "validityHours", 72), key),
                        emails.enqueue("a@exemplo.com", EmailService.Templates.PRIMEIRO_ACESSO,
                                Map.of("token", "2", "validityHours", 72), key))));

        assertThat(results).containsExactly(true, false);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where dedup_key = ?", Long.class, key)).isEqualTo(1L);
    }

    @Test
    void enqueueWithoutOrganizationIsRefused() {
        assertThatThrownBy(() -> emails.enqueue("a@exemplo.com", EmailService.Templates.REDEFINIR_SENHA,
                Map.of(), TestData.unique("sem-org")))
                .isInstanceOf(IllegalStateException.class);
    }
}
```

`os/backend/src/test/java/com/xp77/os/email/EmailDispatcherTest.java`:

```java
package com.xp77.os.email;

import com.xp77.os.config.SchedulingConfig;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.entity.EmailOutbox;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.email.service.EmailDispatcher;
import com.xp77.os.email.service.EmailOutboxProcessor;
import com.xp77.os.email.service.EmailSender;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.mail.MailSendException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/** O SMTP é a única fronteira externa: aqui ele é simulado (o teste com Mailpit usa o real). */
class EmailDispatcherTest extends PostgresTestBase {

    @Autowired
    private EmailService emails;

    @Autowired
    private EmailDispatcher dispatcher;

    @Autowired
    private EmailOutboxProcessor processor;

    @Autowired
    private EmailOutboxRepository outbox;

    @Autowired
    private ApplicationContext context;

    @MockitoBean
    private EmailSender sender;

    @BeforeEach
    void emptyQueue() {
        ownerJdbc().update("delete from email_outbox");
    }

    private String enqueueReset(String to) {
        String key = TestData.unique("despacho");
        OrgContext.runAs(RootOrganization.ID, () -> emails.enqueue(to, EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "tok-" + key, "validityHours", 1), key));
        return key;
    }

    @Test
    void dispatchSendsPendingMessagesAndMarksThemSent() {
        String key = enqueueReset("despacho@exemplo.com");

        assertThat(dispatcher.dispatchBatch()).isEqualTo(1);

        assertThat(outbox.findByDedupKey(key).orElseThrow().getStatus()).isEqualTo(EmailOutbox.SENT);
        verify(sender).send(eq("despacho@exemplo.com"), eq("Redefinição de senha — 77xp"),
                contains("/redefinir-senha?token=tok-" + key));
    }

    @Test
    void failedSendIsRetriedLaterWithBackoff() {
        doThrow(new MailSendException("SMTP fora do ar")).when(sender).send(anyString(), anyString(), anyString());
        String key = enqueueReset("falha@exemplo.com");
        Instant before = Instant.now();

        dispatcher.dispatchBatch();

        EmailOutbox message = outbox.findByDedupKey(key).orElseThrow();
        assertThat(message.getStatus()).isEqualTo(EmailOutbox.PENDING);
        assertThat(message.getAttempts()).isEqualTo(1);
        assertThat(message.getErrorMessage()).contains("SMTP fora do ar");
        assertThat(message.getNextAttemptAt()).isBetween(before.plusSeconds(55), Instant.now().plusSeconds(65));
    }

    @Test
    void aBatchProcessesAtMostTwentyMessages() {
        for (int i = 0; i < 25; i++) {
            enqueueReset("lote" + i + "@exemplo.com");
        }

        assertThat(dispatcher.dispatchBatch()).isEqualTo(20);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where status = 'PENDING'", Long.class)).isEqualTo(5L);
    }

    @Test
    void theRowStaysLockedWhileItIsBeingSent() throws Exception {
        String key = enqueueReset("trava@exemplo.com");
        CountDownLatch sending = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        doAnswer(invocation -> {
            sending.countDown();
            release.await(10, TimeUnit.SECONDS);
            return null;
        }).when(sender).send(anyString(), anyString(), anyString());
        ExecutorService otherInstance = Executors.newSingleThreadExecutor();

        try {
            Future<Boolean> first = otherInstance.submit(processor::processNext);
            assertThat(sending.await(10, TimeUnit.SECONDS)).isTrue();

            // Enquanto a primeira transação envia, a linha segue travada: esta "instância" a pula.
            assertThat(processor.processNext()).isFalse();

            release.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isTrue();
        } finally {
            release.countDown();
            otherInstance.shutdownNow();
        }

        verify(sender, times(1)).send(anyString(), anyString(), anyString());
        assertThat(outbox.findByDedupKey(key).orElseThrow().getStatus()).isEqualTo(EmailOutbox.SENT);
    }

    @Test
    void backgroundJobsAreOffInTests() {
        assertThat(context.getBeansOfType(SchedulingConfig.class)).isEmpty();
    }
}
```

`os/backend/src/test/java/com/xp77/os/email/SmtpEmailSenderMailpitTest.java`:

```java
package com.xp77.os.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.service.EmailDispatcher;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.utility.DockerImageName;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Caminho real: fila → despacho → SMTP → Mailpit (o mesmo do ambiente local). */
class SmtpEmailSenderMailpitTest extends PostgresTestBase {

    static final GenericContainer<?> MAILPIT = new GenericContainer<>(DockerImageName.parse("axllent/mailpit:latest"))
            .withExposedPorts(1025, 8025)
            .waitingFor(Wait.forHttp("/").forPort(8025));

    static {
        MAILPIT.start();
    }

    @DynamicPropertySource
    static void mailpit(DynamicPropertyRegistry registry) {
        registry.add("spring.mail.host", MAILPIT::getHost);
        registry.add("spring.mail.port", () -> MAILPIT.getMappedPort(1025));
    }

    @Autowired
    private EmailService emails;

    @Autowired
    private EmailDispatcher dispatcher;

    private final ObjectMapper mapper = new ObjectMapper();

    @BeforeEach
    void emptyQueue() {
        ownerJdbc().update("delete from email_outbox");
    }

    @Test
    void resetEmailLeavesThroughTheQueueAndArrivesInMailpit() throws Exception {
        String to = TestData.uniqueEmail("mailpit");
        OrgContext.runAs(RootOrganization.ID, () -> emails.enqueue(to, EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", "token-mailpit", "validityHours", 1), TestData.unique("mailpit")));

        assertThat(dispatcher.dispatchBatch()).isEqualTo(1);

        JsonNode message = waitForMessageTo(to);
        assertThat(message.get("Subject").asText()).isEqualTo("Redefinição de senha — 77xp");
        String text = mapper.readTree(get("/api/v1/message/" + message.get("ID").asText())).get("Text").asText();
        assertThat(text).contains("http://localhost:5173/redefinir-senha?token=token-mailpit");
    }

    private String get(String path) throws Exception {
        URI uri = URI.create("http://" + MAILPIT.getHost() + ":" + MAILPIT.getMappedPort(8025) + path);
        return HttpClient.newHttpClient()
                .send(HttpRequest.newBuilder(uri).build(), HttpResponse.BodyHandlers.ofString())
                .body();
    }

    private JsonNode waitForMessageTo(String to) throws Exception {
        for (int attempt = 0; attempt < 25; attempt++) {
            for (JsonNode message : mapper.readTree(get("/api/v1/messages")).get("messages")) {
                for (JsonNode recipient : message.get("To")) {
                    if (to.equals(recipient.get("Address").asText())) {
                        return message;
                    }
                }
            }
            Thread.sleep(200);
        }
        throw new AssertionError("O e-mail para " + to + " não chegou ao Mailpit");
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='EmailOutboxServiceTest,EmailDispatcherTest,SmtpEmailSenderMailpitTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol` para `EmailDispatcher`, `EmailOutboxProcessor`, `EmailSender`, `EmailOutboxRepository`, `SchedulingConfig`.

- [ ] **Passo 5: Escrever repositório, serviços e agendamento**

`os/backend/src/main/java/com/xp77/os/email/repository/EmailOutboxRepository.java`:

```java
package com.xp77.os.email.repository;

import com.xp77.os.email.entity.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, UUID> {

    Optional<EmailOutbox> findByDedupKey(String dedupKey);

    /**
     * Enfileira sem exceção quando a dedupKey já existe (devolve 0). Capturar a violação
     * de unicidade não serviria: no PostgreSQL o erro aborta a transação de quem chamou.
     */
    @Modifying
    @Query(value = """
            INSERT INTO email_outbox (org_id, to_address, template, payload, dedup_key)
            VALUES (:orgId, :to, :template, CAST(:payload AS jsonb), :dedupKey)
            ON CONFLICT (dedup_key) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("orgId") UUID orgId, @Param("to") String to, @Param("template") String template,
                       @Param("payload") String payload, @Param("dedupKey") String dedupKey);

    /** A próxima mensagem vencida, travada até o fim da transação; as travadas são puladas. */
    @Query(value = """
            SELECT * FROM email_outbox
             WHERE status = 'PENDING' AND next_attempt_at <= :now
             ORDER BY next_attempt_at, created_at
             LIMIT 1
             FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    Optional<EmailOutbox> lockNextDue(@Param("now") Instant now);
}
```

`os/backend/src/main/java/com/xp77/os/email/service/EmailOutboxService.java`:

```java
package com.xp77.os.email.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.organizations.api.OrgContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class EmailOutboxService implements EmailService {

    private final EmailOutboxRepository outbox;
    private final ObjectMapper mapper;

    public EmailOutboxService(EmailOutboxRepository outbox, ObjectMapper mapper) {
        this.outbox = outbox;
        this.mapper = mapper;
    }

    @Override
    @Transactional
    public boolean enqueue(String to, String template, Map<String, Object> data, String dedupKey) {
        UUID orgId = OrgContext.current()
                .orElseThrow(() -> new IllegalStateException("E-mail enfileirado sem organização no contexto"));
        String payload;
        try {
            payload = mapper.writeValueAsString(data == null ? Map.of() : data);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Não foi possível serializar os dados do e-mail", e);
        }
        return outbox.insertIfAbsent(orgId, to, template, payload, dedupKey) == 1;
    }
}
```

`os/backend/src/main/java/com/xp77/os/email/service/EmailSender.java`:

```java
package com.xp77.os.email.service;

/** Transporte do e-mail. Trocar SMTP por uma API de provedor é escrever outra implementação. */
public interface EmailSender {

    void send(String to, String subject, String body);
}
```

`os/backend/src/main/java/com/xp77/os/email/service/SmtpEmailSender.java`:

```java
package com.xp77.os.email.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailSender implements EmailSender {

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpEmailSender(JavaMailSender mailSender, @Value("${xp77.email.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    @Override
    public void send(String to, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
```

`os/backend/src/main/java/com/xp77/os/email/service/EmailOutboxProcessor.java`:

```java
package com.xp77.os.email.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.email.entity.EmailOutbox;
import com.xp77.os.email.repository.EmailOutboxRepository;
import com.xp77.os.email.service.EmailTemplates.RenderedEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * Processa UMA mensagem por transação. O FOR UPDATE SKIP LOCKED e o envio acontecem
 * na mesma transação, então a linha fica travada até o commit — depois do envio.
 * É chamado por outro bean (EmailDispatcher): assim o @Transactional passa pelo proxy
 * do Spring de verdade (chamada interna, this.metodo(), o ignoraria).
 *
 * <p>Garantia at-least-once: se o processo morrer entre o envio e o commit, a mensagem
 * volta a PENDING e sai de novo. Nunca receber seria pior que receber duas vezes.
 */
@Component
public class EmailOutboxProcessor {

    private static final Logger log = LoggerFactory.getLogger(EmailOutboxProcessor.class);

    private final EmailOutboxRepository outbox;
    private final EmailTemplates templates;
    private final EmailSender sender;
    private final ObjectMapper mapper;

    public EmailOutboxProcessor(EmailOutboxRepository outbox, EmailTemplates templates,
                                EmailSender sender, ObjectMapper mapper) {
        this.outbox = outbox;
        this.templates = templates;
        this.sender = sender;
        this.mapper = mapper;
    }

    /** @return false quando não há mensagem vencida e livre. */
    @Transactional
    public boolean processNext() {
        Optional<EmailOutbox> next = outbox.lockNextDue(Instant.now());
        if (next.isEmpty()) {
            return false;
        }
        EmailOutbox message = next.get();
        try {
            Map<String, Object> data = mapper.readValue(message.getPayload(), new TypeReference<>() {
            });
            RenderedEmail email = templates.render(message.getTemplate(), data);
            sender.send(message.getToAddress(), email.subject(), email.body());
            message.markSent(Instant.now());
        } catch (Exception e) {
            log.warn("Falha ao enviar o e-mail {} ({}): {}", message.getId(), message.getTemplate(), e.getMessage());
            message.registerFailure(e.getMessage(), Instant.now());
        }
        outbox.save(message);
        return true;
    }
}
```

`os/backend/src/main/java/com/xp77/os/email/service/EmailDispatcher.java`:

```java
package com.xp77.os.email.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Ciclo da fila: a cada 15 s, até 20 mensagens, cada uma na própria transação. */
@Component
public class EmailDispatcher {

    private static final Logger log = LoggerFactory.getLogger(EmailDispatcher.class);

    private final EmailOutboxProcessor processor;
    private final int batchSize;

    public EmailDispatcher(EmailOutboxProcessor processor, @Value("${xp77.email.batch-size}") int batchSize) {
        this.processor = processor;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${xp77.email.dispatch-interval-ms}")
    public void tick() {
        try {
            dispatchBatch();
        } catch (RuntimeException e) {
            log.error("Falha inesperada no despacho de e-mails", e);
        }
    }

    /** @return quantas mensagens foram processadas (enviadas ou reagendadas). */
    public int dispatchBatch() {
        int processed = 0;
        while (processed < batchSize && processor.processNext()) {
            processed++;
        }
        return processed;
    }
}
```

`os/backend/src/main/java/com/xp77/os/config/SchedulingConfig.java`:

```java
package com.xp77.os.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Liga os @Scheduled só quando xp77.scheduling.enabled=true (desligado no perfil test). */
@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(prefix = "xp77.scheduling", name = "enabled", havingValue = "true")
public class SchedulingConfig {
}
```

- [ ] **Passo 6: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='EmailOutboxServiceTest,EmailDispatcherTest,SmtpEmailSenderMailpitTest' test`
Expected: código de saída 0, `Tests run: 9, Failures: 0, Errors: 0`, `BUILD SUCCESS` (a primeira execução baixa a imagem `axllent/mailpit`).

- [ ] **Passo 7: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 8: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src/main/resources os/backend/src/main/java/com/xp77/os/email os/backend/src/main/java/com/xp77/os/config/SchedulingConfig.java os/backend/src/test/java/com/xp77/os/email
git commit -m "feat(email): add transactional outbox with per-message locking, backoff and SMTP delivery" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 11: Redefinição de senha, primeiro acesso, e-mail de convite e dono inicial

**Arquivos:**
- Modify: `os/backend/src/main/resources/application.yml` (validade dos links e `xp77.bootstrap.owner-email`)
- Modify: `os/backend/src/main/java/com/xp77/os/email/api/EmailService.java`, `email/service/EmailTemplates.java` (template `CONVITE`)
- Create: `os/backend/src/main/java/com/xp77/os/auth/api/FirstAccessTokens.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/entity/TokenPurpose.java`, `auth/entity/PasswordResetToken.java`, `auth/repository/PasswordResetTokenRepository.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/service/PasswordResetService.java`, `auth/service/OwnerBootstrapService.java`, `auth/service/OwnerBootstrapRunner.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/dto/ForgotPasswordRequest.java`, `auth/dto/SetPasswordRequest.java`, `auth/controller/PasswordController.java`
- Test: `os/backend/src/test/java/com/xp77/os/email/EmailTemplatesTest.java` (modify), `os/backend/src/test/java/com/xp77/os/auth/FirstAccessTokensTest.java`, `auth/PasswordResetEndpointsTest.java`, `auth/OwnerBootstrapTest.java`

**Interfaces:**
- Consumes: `UserDirectory`, `MembershipDirectory` (Tarefa 6); `RefreshTokenService.revokeAll`, `OpaqueTokens` (Tarefa 8); `EmailService` e `EmailTemplates` (Tarefa 10); `OrgContext`, `RootOrganization` (Tarefa 5); `TestAuth` (Tarefa 9).
- Produces:
  - `EmailService.Templates.CONVITE` — dados: `role` (`ADMIN`/`TEAM`/`CLIENT`), `name` (opcional), `token` + `validityHours` (opcionais: sem token, o e-mail manda entrar com a senha em `${APP_BASE_URL}/entrar`). Texto diferente para cliente e para equipe.
  - `interface FirstAccessTokens` (`auth.api`) — `record Issued(String token, long validityHours)`, `Issued issueFor(UUID userId)`: novo link de 72 h; os links de primeiro acesso ainda não usados da pessoa deixam de valer. Usado pelo dono inicial (aqui) e pelos convites (Tarefa 14).
  - `enum TokenPurpose { FIRST_ACCESS, RESET }`; `PasswordResetService` — `void requestReset(UserAccount user)`, `Issued issueFor(UUID userId)`, `void redeem(String token, TokenPurpose purpose, String newPassword)` (link inválido, expirado, usado ou de outra finalidade → `BusinessException(CLIENT_ERROR, "Link inválido ou expirado")`; ao redefinir, todas as sessões caem).
  - Rotas públicas: `POST /auth/forgot-password {email}` → 204 sempre; `POST /auth/reset-password {token, password}` → 204 (só link `RESET`); `POST /auth/first-access {token, password}` → 204 (só link `FIRST_ACCESS`).
  - `OwnerBootstrapService.ensureOwner(String email): boolean` (cria só na primeira vez) e `OwnerBootstrapRunner` (`ApplicationRunner`, age só com `xp77.bootstrap.owner-email` preenchido, com `OrgContext` = raiz).
  - Propriedades: `xp77.auth.first-access-token-hours` (72), `xp77.auth.reset-token-hours` (1), `xp77.bootstrap.owner-email` (`${BOOTSTRAP_OWNER_EMAIL:}`).

Diferenças em relação ao Beto_Banco: primeiro acesso e redefinição têm rotas próprias e cada uma aceita só a sua finalidade de link (lá um link de primeiro acesso servia em `/reset-password`); gerar um novo link de primeiro acesso invalida o anterior (“reenviar convite invalida o link anterior”, D10); os e-mails trazem a validade vinda da configuração.

- [ ] **Passo 1: Configuração**

Em `os/backend/src/main/resources/application.yml`, trocar

```yaml
    cookie-same-site: Lax
```

por

```yaml
    cookie-same-site: Lax
    first-access-token-hours: 72
    reset-token-hours: 1
```

e trocar

```yaml
  scheduling:
    # Processos em segundo plano (fila de e-mail). Desligado nos testes, que chamam
    # o despacho diretamente.
    enabled: true
```

por

```yaml
  scheduling:
    # Processos em segundo plano (fila de e-mail). Desligado nos testes, que chamam
    # o despacho diretamente.
    enabled: true
  bootstrap:
    # Cria o dono da organização 77xp e enfileira o e-mail de primeiro acesso.
    # Vazio = não faz nada.
    owner-email: ${BOOTSTRAP_OWNER_EMAIL:}
```

- [ ] **Passo 2: Template de convite — testes primeiro**

Em `os/backend/src/test/java/com/xp77/os/email/EmailTemplatesTest.java`, trocar

```java
    @Test
    void unknownTemplateOrMissingTokenIsRefused() {
```

por

```java
    @Test
    void clientInvitationWithTokenLinksToFirstAccessAndMentionsTheClientArea() {
        RenderedEmail email = templates.render(EmailService.Templates.CONVITE,
                Map.of("role", "CLIENT", "name", "Ana", "token", "tok-1", "validityHours", 72));

        assertThat(email.subject()).isEqualTo("Seu acesso à Área do cliente da 77xp");
        assertThat(email.body()).startsWith("Olá, Ana!").contains("Área do cliente")
                .contains("http://localhost:5173/primeiro-acesso?token=tok-1").contains("72 horas");
    }

    @Test
    void teamInvitationForSomeoneWhoAlreadyHasAPasswordLinksToLogin() {
        RenderedEmail email = templates.render(EmailService.Templates.CONVITE, Map.of("role", "ADMIN"));

        assertThat(email.subject()).isEqualTo("Convite para o painel da 77xp");
        assertThat(email.body()).startsWith("Olá!").contains("como administrador")
                .contains("http://localhost:5173/entrar").doesNotContain("primeiro-acesso");
    }

    @Test
    void unknownTemplateOrMissingTokenIsRefused() {
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=EmailTemplatesTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... variable CONVITE`.

- [ ] **Passo 3: Escrever o template de convite**

Em `os/backend/src/main/java/com/xp77/os/email/api/EmailService.java`, trocar

```java
        public static final String REDEFINIR_SENHA = "REDEFINIR_SENHA";
```

por

```java
        public static final String REDEFINIR_SENHA = "REDEFINIR_SENHA";
        public static final String CONVITE = "CONVITE";
```

Em `os/backend/src/main/java/com/xp77/os/email/service/EmailTemplates.java`, trocar

```java
            default -> throw new IllegalArgumentException("Template de e-mail desconhecido: " + template);
        };
    }
```

por

```java
            case EmailService.Templates.CONVITE -> invitation(data);
            default -> throw new IllegalArgumentException("Template de e-mail desconhecido: " + template);
        };
    }

    /**
     * Convite (D10). O texto muda para cliente e para equipe; com token a pessoa cria a
     * senha, sem token (ela já tem senha de outra organização) só entra com a dela.
     */
    private RenderedEmail invitation(Map<String, Object> data) {
        boolean client = "CLIENT".equals(data.get("role"));
        String subject = client ? "Seu acesso à Área do cliente da 77xp" : "Convite para o painel da 77xp";
        String destination = client
                ? "a Área do cliente da 77xp, onde você acompanha o que fazemos juntos"
                : "o painel da 77xp como " + ("ADMIN".equals(data.get("role")) ? "administrador" : "membro da equipe");
        String action = data.get("token") == null
                ? "Você já tem uma senha na 77xp: é só entrar com ela em\n" + baseUrl + "/entrar"
                : "Crie sua senha neste link (válido por " + validity(data) + "):\n"
                        + baseUrl + "/primeiro-acesso?token=" + token(data);
        return new RenderedEmail(subject, """
                %s

                Você foi convidado para acessar %s.

                %s

                Se você não esperava este convite, ignore esta mensagem.

                Equipe 77xp""".formatted(greeting(data), destination, action));
    }

    private static String greeting(Map<String, Object> data) {
        Object name = data.get("name");
        return name == null || name.toString().isBlank() ? "Olá!" : "Olá, " + name + "!";
    }
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=EmailTemplatesTest test`
Expected: código de saída 0, `Tests run: 5, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 4: Escrever os testes de links e rotas (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/auth/FirstAccessTokensTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.service.PasswordResetService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FirstAccessTokensTest extends PostgresTestBase {

    @Autowired
    private FirstAccessTokens firstAccess;

    @Autowired
    private PasswordResetService resets;

    @Test
    void issuingANewLinkInvalidatesThePreviousOne() {
        UUID user = TestData.createUser(TestData.uniqueEmail("convidado"), null);
        String first = firstAccess.issueFor(user).token();

        FirstAccessTokens.Issued second = firstAccess.issueFor(user);

        assertThat(second.validityHours()).isEqualTo(72);
        assertThatThrownBy(() -> resets.redeem(first, TokenPurpose.FIRST_ACCESS, "senha-forte-123"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("Link inválido ou expirado");
        resets.redeem(second.token(), TokenPurpose.FIRST_ACCESS, "senha-forte-123");
        assertThat(ownerJdbc().queryForObject(
                "select password_hash from users where id = ?", String.class, user)).startsWith("{argon2}");
    }
}
```

`os/backend/src/test/java/com/xp77/os/auth/PasswordResetEndpointsTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PasswordResetEndpointsTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FirstAccessTokens firstAccess;

    private void forgot(String email) throws Exception {
        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isNoContent());
    }

    private String lastResetTokenSentTo(String email) {
        return ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'REDEFINIR_SENHA' order by created_at desc limit 1",
                String.class, email);
    }

    private ResultActions setPassword(String route, String token, String password) throws Exception {
        return mockMvc.perform(post(route).contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void forgotPasswordAnswersTheSameForKnownAndUnknownEmails() throws Exception {
        String known = TestData.uniqueEmail("existe");
        TestAuth.rootMember(known, "TEAM");
        String unknown = TestData.uniqueEmail("nao-existe");

        forgot(known);
        forgot(unknown);

        assertThat(ownerJdbc().queryForObject("select count(*) from email_outbox where to_address = ? "
                + "and template = 'REDEFINIR_SENHA'", Long.class, known)).isEqualTo(1L);
        assertThat(ownerJdbc().queryForObject(
                "select count(*) from email_outbox where to_address = ?", Long.class, unknown)).isZero();
    }

    @Test
    void theResetLinkFromTheEmailSetsTheNewPasswordAndEndsEverySession() throws Exception {
        String email = TestData.uniqueEmail("esqueci");
        TestAuth.rootMember(email, "TEAM");
        Cookie session = TestAuth.refreshCookie(mockMvc, email);

        forgot(email);
        setPassword("/auth/reset-password", lastResetTokenSentTo(email), "senha-nova-456")
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, "senha-nova-456").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void aLinkWorksOnlyOnce() throws Exception {
        String email = TestData.uniqueEmail("uma-vez");
        TestAuth.rootMember(email, "TEAM");
        forgot(email);
        String token = lastResetTokenSentTo(email);

        setPassword("/auth/reset-password", token, "primeira-vez-123").andExpect(status().isNoContent());
        setPassword("/auth/reset-password", token, "segunda-vez-123")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("CLIENT_ERROR"))
                .andExpect(jsonPath("$.error.message").value("Link inválido ou expirado"));
    }

    @Test
    void anExpiredLinkIsRefused() throws Exception {
        String email = TestData.uniqueEmail("expirado");
        UUID user = TestAuth.rootMember(email, "TEAM");
        forgot(email);
        ownerJdbc().update("update password_reset_tokens set expires_at = now() - interval '1 minute' "
                + "where user_id = ?", user);

        setPassword("/auth/reset-password", lastResetTokenSentTo(email), "senha-nova-456")
                .andExpect(status().isBadRequest());
    }

    @Test
    void eachRouteAcceptsOnlyItsOwnKindOfLink() throws Exception {
        String email = TestData.uniqueEmail("pendente");
        UUID user = TestData.createUser(email, null);
        TestData.addMembership(user, RootOrganization.ID, "CLIENT");
        String firstAccessToken = firstAccess.issueFor(user).token();
        forgot(email);
        String resetToken = lastResetTokenSentTo(email);

        setPassword("/auth/reset-password", firstAccessToken, "senha-forte-123").andExpect(status().isBadRequest());
        setPassword("/auth/first-access", resetToken, "senha-forte-123").andExpect(status().isBadRequest());
        setPassword("/auth/first-access", firstAccessToken, "senha-forte-123").andExpect(status().isNoContent());
        assertThat(TestAuth.login(mockMvc, email, "senha-forte-123").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void shortPasswordIsRejectedWith422() throws Exception {
        setPassword("/auth/first-access", "qualquer", "123")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.fieldErrors[0].field").value("password"));
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='FirstAccessTokensTest,PasswordResetEndpointsTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.auth.api does not exist` e `cannot find symbol ... TokenPurpose`.

- [ ] **Passo 5: Escrever entidade, repositório, API, serviço e rotas**

`os/backend/src/main/java/com/xp77/os/auth/entity/TokenPurpose.java`:

```java
package com.xp77.os.auth.entity;

/** Primeiro acesso (convite ou dono inicial, 72 h) e redefinição de senha (1 h). */
public enum TokenPurpose {
    FIRST_ACCESS,
    RESET
}
```

`os/backend/src/main/java/com/xp77/os/auth/entity/PasswordResetToken.java`:

```java
package com.xp77.os.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TokenPurpose purpose;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected PasswordResetToken() {
    }

    public PasswordResetToken(UUID userId, String tokenHash, TokenPurpose purpose, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.purpose = purpose;
        this.expiresAt = expiresAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public TokenPurpose getPurpose() {
        return purpose;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    public boolean isValid() {
        return usedAt == null && Instant.now().isBefore(expiresAt);
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/repository/PasswordResetTokenRepository.java`:

```java
package com.xp77.os.auth.repository;

import com.xp77.os.auth.entity.PasswordResetToken;
import com.xp77.os.auth.entity.TokenPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /** Invalida (marca como usados) os links ainda não usados da pessoa com essa finalidade. */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now "
            + "WHERE t.userId = :userId AND t.purpose = :purpose AND t.usedAt IS NULL")
    int invalidateUnused(@Param("userId") UUID userId, @Param("purpose") TokenPurpose purpose,
                         @Param("now") Instant now);
}
```

`os/backend/src/main/java/com/xp77/os/auth/api/FirstAccessTokens.java`:

```java
package com.xp77.os.auth.api;

import java.util.UUID;

/**
 * Links de primeiro acesso, para quem cria contas (dono inicial e convites). O valor em
 * claro só existe no retorno; no banco fica só o hash. Chame dentro da transação que
 * enfileira o e-mail: ou o link enviado existe no banco, ou nada acontece.
 */
public interface FirstAccessTokens {

    record Issued(String token, long validityHours) {
    }

    /** Novo link (72 h). Os links de primeiro acesso ainda não usados da pessoa deixam de valer. */
    Issued issueFor(UUID userId);
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/PasswordResetService.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.entity.PasswordResetToken;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.repository.PasswordResetTokenRepository;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class PasswordResetService implements FirstAccessTokens {

    public static final String INVALID_LINK = "Link inválido ou expirado";

    private final PasswordResetTokenRepository tokens;
    private final UserDirectory users;
    private final RefreshTokenService sessions;
    private final EmailService emails;
    private final long firstAccessHours;
    private final long resetHours;

    public PasswordResetService(PasswordResetTokenRepository tokens,
                                UserDirectory users,
                                RefreshTokenService sessions,
                                EmailService emails,
                                @Value("${xp77.auth.first-access-token-hours}") long firstAccessHours,
                                @Value("${xp77.auth.reset-token-hours}") long resetHours) {
        this.tokens = tokens;
        this.users = users;
        this.sessions = sessions;
        this.emails = emails;
        this.firstAccessHours = firstAccessHours;
        this.resetHours = resetHours;
    }

    /**
     * Cria o link de redefinição e enfileira o e-mail na MESMA transação. Cada pedido gera
     * link novo (dedup pelo hash do token): pedir duas vezes manda dois links válidos.
     */
    @Transactional
    public void requestReset(UserAccount user) {
        String token = create(user.id(), TokenPurpose.RESET, resetHours);
        emails.enqueue(user.email(), EmailService.Templates.REDEFINIR_SENHA,
                Map.of("token", token, "validityHours", resetHours),
                "redefinir-senha:" + OpaqueTokens.sha256Hex(token));
    }

    @Override
    @Transactional
    public Issued issueFor(UUID userId) {
        tokens.invalidateUnused(userId, TokenPurpose.FIRST_ACCESS, Instant.now());
        return new Issued(create(userId, TokenPurpose.FIRST_ACCESS, firstAccessHours), firstAccessHours);
    }

    /** Define a senha pelo link. Todas as sessões da pessoa caem: quem redefine costuma estar reagindo a um problema. */
    @Transactional
    public void redeem(String value, TokenPurpose purpose, String newPassword) {
        if (value == null || value.isBlank()) {
            throw invalidLink();
        }
        PasswordResetToken token = tokens.findByTokenHash(OpaqueTokens.sha256Hex(value))
                .filter(found -> found.getPurpose() == purpose)
                .filter(PasswordResetToken::isValid)
                .orElseThrow(PasswordResetService::invalidLink);

        users.setPassword(token.getUserId(), newPassword);
        token.markUsed();
        tokens.saveAndFlush(token);
        sessions.revokeAll(token.getUserId());
    }

    private String create(UUID userId, TokenPurpose purpose, long hours) {
        String value = OpaqueTokens.newValue();
        tokens.saveAndFlush(new PasswordResetToken(userId, OpaqueTokens.sha256Hex(value), purpose,
                Instant.now().plus(Duration.ofHours(hours))));
        return value;
    }

    private static BusinessException invalidLink() {
        return new BusinessException(ErrorCode.CLIENT_ERROR, INVALID_LINK);
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/dto/ForgotPasswordRequest.java`:

```java
package com.xp77.os.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "Informe o e-mail")
        @Email(message = "E-mail inválido")
        String email) {
}
```

`os/backend/src/main/java/com/xp77/os/auth/dto/SetPasswordRequest.java`:

```java
package com.xp77.os.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Corpo de /auth/reset-password e /auth/first-access: o token do link e a senha nova. */
public record SetPasswordRequest(
        @NotBlank(message = "Link inválido ou expirado")
        String token,

        @NotBlank(message = "Informe a senha")
        @Size(min = 8, message = "A senha precisa ter ao menos 8 caracteres")
        String password) {
}
```

`os/backend/src/main/java/com/xp77/os/auth/controller/PasswordController.java`:

```java
package com.xp77.os.auth.controller;

import com.xp77.os.auth.dto.ForgotPasswordRequest;
import com.xp77.os.auth.dto.SetPasswordRequest;
import com.xp77.os.auth.entity.TokenPurpose;
import com.xp77.os.auth.service.PasswordResetService;
import com.xp77.os.users.api.UserDirectory;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Rotas públicas de senha: esqueci, redefinir (link RESET) e primeiro acesso (link FIRST_ACCESS). */
@RestController
@RequestMapping("/auth")
public class PasswordController {

    private final UserDirectory users;
    private final PasswordResetService resets;

    public PasswordController(UserDirectory users, PasswordResetService resets) {
        this.users = users;
        this.resets = resets;
    }

    /** Resposta idêntica exista o e-mail ou não: qualquer diferença enumeraria contas. */
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        users.findActiveByEmail(request.email()).ifPresent(resets::requestReset);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody SetPasswordRequest request) {
        resets.redeem(request.token(), TokenPurpose.RESET, request.password());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/first-access")
    public ResponseEntity<Void> firstAccess(@Valid @RequestBody SetPasswordRequest request) {
        resets.redeem(request.token(), TokenPurpose.FIRST_ACCESS, request.password());
        return ResponseEntity.noContent().build();
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='FirstAccessTokensTest,PasswordResetEndpointsTest' test`
Expected: código de saída 0, `Tests run: 7, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 6: Escrever o teste do dono inicial (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/auth/OwnerBootstrapTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.auth.service.OwnerBootstrapRunner;
import com.xp77.os.auth.service.OwnerBootstrapService;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class OwnerBootstrapTest extends PostgresTestBase {

    @Autowired
    private OwnerBootstrapService bootstrap;

    @Autowired
    private MockMvc mockMvc;

    private boolean ensure(String email) {
        return OrgContext.callAs(RootOrganization.ID, () -> bootstrap.ensureOwner(email));
    }

    private String roleInRoot(String email) {
        return ownerJdbc().queryForObject("select m.role from memberships m join users u on u.id = m.user_id "
                + "where u.email = ? and m.org_id = ?", String.class, email, RootOrganization.ID);
    }

    @Test
    void createsTheOwnerWithoutPasswordAndEnqueuesTheFirstAccessEmailOnlyOnce() {
        String email = TestData.uniqueEmail("dono");

        assertThat(ensure(email)).isTrue();
        assertThat(ensure(email)).isFalse();

        assertThat(ownerJdbc().queryForObject(
                "select password_hash from users where email = ?", String.class, email)).isNull();
        assertThat(roleInRoot(email)).isEqualTo("OWNER");
        assertThat(ownerJdbc().queryForObject("select count(*) from email_outbox where to_address = ? "
                + "and template = 'PRIMEIRO_ACESSO'", Long.class, email)).isEqualTo(1L);
    }

    @Test
    void theFirstAccessLinkLetsTheOwnerCreateThePasswordAndLogIn() throws Exception {
        String email = TestData.uniqueEmail("dono-senha");
        ensure(email);
        String token = ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'PRIMEIRO_ACESSO'", String.class, email);

        mockMvc.perform(post("/auth/first-access").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"password\":\"senha-do-dono-123\"}"))
                .andExpect(status().isNoContent());

        assertThat(TestAuth.login(mockMvc, email, "senha-do-dono-123").getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void runnerDoesNothingWithoutAnEmail() {
        long before = ownerJdbc().queryForObject("select count(*) from users", Long.class);

        new OwnerBootstrapRunner(bootstrap, "  ").run(null);

        assertThat(ownerJdbc().queryForObject("select count(*) from users", Long.class)).isEqualTo(before);
    }

    @Test
    void runnerCreatesTheOwnerInTheRootOrganization() {
        String email = TestData.uniqueEmail("runner");

        new OwnerBootstrapRunner(bootstrap, email).run(null);

        assertThat(roleInRoot(email)).isEqualTo("OWNER");
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=OwnerBootstrapTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class OwnerBootstrapService`.

- [ ] **Passo 7: Escrever o dono inicial**

`os/backend/src/main/java/com/xp77/os/auth/service/OwnerBootstrapService.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Garante o dono (OWNER) da organização 77xp. Idempotente: cria a pessoa e manda o
 * e-mail de primeiro acesso só na primeira vez; nas próximas subidas só confirma o
 * vínculo. Se o link vencer, o dono usa "esqueci minha senha". Precisa de
 * OrgContext = raiz (quem chama é o OwnerBootstrapRunner).
 */
@Service
public class OwnerBootstrapService {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final FirstAccessTokens firstAccess;
    private final EmailService emails;

    public OwnerBootstrapService(UserDirectory users, MembershipDirectory memberships,
                                 FirstAccessTokens firstAccess, EmailService emails) {
        this.users = users;
        this.memberships = memberships;
        this.firstAccess = firstAccess;
        this.emails = emails;
    }

    /** @return true se a pessoa acabou de ser criada. */
    @Transactional
    public boolean ensureOwner(String email) {
        Optional<UserAccount> existing = users.findByEmail(email);
        UserAccount owner = existing.orElseGet(() -> users.createWithoutPassword(email, null));
        memberships.grant(owner.id(), RootOrganization.ID, MembershipRole.OWNER);
        if (existing.isPresent()) {
            return false;
        }
        FirstAccessTokens.Issued link = firstAccess.issueFor(owner.id());
        emails.enqueue(owner.email(), EmailService.Templates.PRIMEIRO_ACESSO,
                Map.of("token", link.token(), "validityHours", link.validityHours()),
                "primeiro-acesso:" + owner.id());
        return true;
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/OwnerBootstrapRunner.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Comando de inicialização: com BOOTSTRAP_OWNER_EMAIL preenchido, garante o dono da
 * organização 77xp a cada subida. Bean separado do serviço transacional, para o
 * @Transactional valer de verdade.
 */
@Component
public class OwnerBootstrapRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(OwnerBootstrapRunner.class);

    private final OwnerBootstrapService bootstrap;
    private final String ownerEmail;

    public OwnerBootstrapRunner(OwnerBootstrapService bootstrap,
                                @Value("${xp77.bootstrap.owner-email}") String ownerEmail) {
        this.bootstrap = bootstrap;
        this.ownerEmail = ownerEmail;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (ownerEmail == null || ownerEmail.isBlank()) {
            return;
        }
        boolean created = OrgContext.callAs(RootOrganization.ID, () -> bootstrap.ensureOwner(ownerEmail.trim()));
        log.info(created
                ? "Dono da organização 77xp criado; e-mail de primeiro acesso enfileirado."
                : "Dono da organização 77xp já existia; nada a fazer.");
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=OwnerBootstrapTest test`
Expected: código de saída 0, `Tests run: 4, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 8: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 9: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources/application.yml os/backend/src/main/java/com/xp77/os/email os/backend/src/main/java/com/xp77/os/auth os/backend/src/test/java/com/xp77/os/email/EmailTemplatesTest.java os/backend/src/test/java/com/xp77/os/auth
git commit -m "feat(auth): add password reset, first access links, invitation email template and owner bootstrap" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 12: Limite de tentativas pelo IP confiável

**Arquivos:**
- Modify: `os/backend/pom.xml` (`bucket4j_jdk17-core`)
- Modify: `os/backend/src/main/resources/application.yml`, `application-test.yml` (`xp77.rate-limit.per-minute`)
- Create: `os/backend/src/main/java/com/xp77/os/security/RateLimitFilter.java`
- Test: `os/backend/src/test/java/com/xp77/os/security/RateLimitFilterTest.java`

**Interfaces:**
- Consumes: `ClientIpResolver` (Tarefa 9); envelope de erro e `TraceIdFilter` (Tarefa 2); rotas de `/auth` (Tarefas 9 e 11).
- Produces: `RateLimitFilter` (`@Order(Ordered.HIGHEST_PRECEDENCE + 10)`) — `RateLimitFilter(ObjectMapper mapper, ClientIpResolver clientIp, int perMinute)`, `int limit()`, `int routeWideLimit(String route)`; limita `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` e `/auth/first-access` por visitante (IP confiável) e por rota (teto geral); estouro → 429 `RATE_LIMIT_EXCEEDED` no envelope com `Retry-After: 60`. Propriedade `xp77.rate-limit.per-minute` (30; 1000 no perfil `test`).

Correção em relação ao Beto_Banco: a chave do visitante é o IP do `ClientIpResolver` (o endereço registrado pelo proxy confiável), e não o primeiro valor do `X-Forwarded-For`, que o cliente escreve quando chama o Render direto. O teto geral por rota continua (limita quem troca de IP a cada tentativa). As rotas de cadastro, leads e checkout do Beto_Banco não existem aqui.

- [ ] **Passo 1: Adicionar o Bucket4j e a configuração**

Inserir no `os/backend/pom.xml` logo antes da linha `        <!-- Testes -->`:

```xml
        <dependency>
            <groupId>com.bucket4j</groupId>
            <artifactId>bucket4j_jdk17-core</artifactId>
            <version>8.14.0</version>
        </dependency>
```

Em `os/backend/src/main/resources/application.yml`, trocar

```yaml
    trusted-proxy-hops: 1
```

por

```yaml
    trusted-proxy-hops: 1
    # Tentativas por minuto e por IP em login, esqueci-a-senha, redefinição e primeiro acesso.
    per-minute: 30
```

Em `os/backend/src/main/resources/application-test.yml`, trocar

```yaml
  scheduling:
    enabled: false
```

por

```yaml
  scheduling:
    enabled: false
  rate-limit:
    # Alto: as suítes fazem dezenas de logins do mesmo endereço. O RateLimitFilterTest baixa para 5.
    per-minute: 1000
```

- [ ] **Passo 2: Escrever o teste (falha primeiro)**

`os/backend/src/test/java/com/xp77/os/security/RateLimitFilterTest.java`:

```java
package com.xp77.os.security;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Limite baixo só nesta classe; o perfil de teste usa um alto para não atrapalhar as outras. */
@AutoConfigureMockMvc
@TestPropertySource(properties = "xp77.rate-limit.per-minute=5")
class RateLimitFilterTest extends PostgresTestBase {

    private static final String LOGIN = "{\"email\":\"forca@bruta.com\",\"password\":\"tentativa\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RateLimitFilter filter;

    private MockHttpServletRequestBuilder login(String remoteAddr, String forwardedFor) {
        MockHttpServletRequestBuilder request = post("/auth/login")
                .with(r -> {
                    r.setRemoteAddr(remoteAddr);
                    return r;
                })
                .contentType(MediaType.APPLICATION_JSON).content(LOGIN);
        return forwardedFor == null ? request : request.header("X-Forwarded-For", forwardedFor);
    }

    @Test
    void tooManyLoginAttemptsReturn429InTheEnvelope() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.0.0.1", null));
        }

        mockMvc.perform(login("10.0.0.1", null))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After", "60"))
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.error.status").value(429));
    }

    @Test
    void anotherAddressIsNotAffected() throws Exception {
        for (int i = 0; i < filter.limit() + 2; i++) {
            mockMvc.perform(login("10.0.0.2", null));
        }

        mockMvc.perform(login("10.0.0.3", null)).andExpect(status().isUnauthorized());
    }

    @Test
    void visitorsBehindTheTrustedProxyAreToldApartByTheAddressItRecorded() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.9.9.9", "200.1.1.1"));
        }

        mockMvc.perform(login("10.9.9.9", "200.1.1.1")).andExpect(status().isTooManyRequests());
        mockMvc.perform(login("10.9.9.9", "200.2.2.2")).andExpect(status().isUnauthorized());
    }

    @Test
    void forgingTheFirstForwardedValueDoesNotEscapeTheLimit() throws Exception {
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(login("10.9.9.8", "198.18.0." + i + ", 200.3.3.3"));
        }

        // Valor forjado novo a cada tentativa: no Beto_Banco isso criava um contador novo.
        mockMvc.perform(login("10.9.9.8", "198.18.1.99, 200.3.3.3")).andExpect(status().isTooManyRequests());
    }

    @Test
    void theRouteWideLimitHoldsEvenWithManyAddresses() throws Exception {
        String route = "/auth/forgot-password";
        String body = "{\"email\":\"ninguem@exemplo.com\"}";
        for (int i = 0; i < filter.routeWideLimit(route); i++) {
            mockMvc.perform(post(route).header("X-Forwarded-For", "198.51." + (i / 250) + "." + (i % 250))
                    .contentType(MediaType.APPLICATION_JSON).content(body));
        }

        mockMvc.perform(post(route).header("X-Forwarded-For", "203.0.113.7")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void firstAccessIsLimitedToo() throws Exception {
        String body = "{\"token\":\"" + UUID.randomUUID() + "\",\"password\":\"senha-forte-123\"}";
        for (int i = 0; i < filter.limit(); i++) {
            mockMvc.perform(post("/auth/first-access").with(r -> {
                r.setRemoteAddr("10.0.0.7");
                return r;
            }).contentType(MediaType.APPLICATION_JSON).content(body));
        }

        mockMvc.perform(post("/auth/first-access").with(r -> {
                    r.setRemoteAddr("10.0.0.7");
                    return r;
                }).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void routesOutsideAuthAreNotLimited() throws Exception {
        for (int i = 0; i < filter.limit() + 5; i++) {
            mockMvc.perform(get("/actuator/health").with(r -> {
                r.setRemoteAddr("10.0.0.4");
                return r;
            }));
        }

        mockMvc.perform(get("/actuator/health").with(r -> {
            r.setRemoteAddr("10.0.0.4");
            return r;
        })).andExpect(status().isOk());
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=RateLimitFilterTest test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol ... class RateLimitFilter`.

- [ ] **Passo 3: Escrever o `RateLimitFilter`**

`os/backend/src/main/java/com/xp77/os/security/RateLimitFilter.java`:

```java
package com.xp77.os.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.ErrorPayload;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.shared.trace.TraceIdFilter;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Limita tentativas nas rotas públicas de senha, por visitante e por rota.
 *
 * <p>Por visitante: contra força bruta de um mesmo lugar, com o IP do ClientIpResolver
 * (o endereço registrado pelo proxy confiável — nunca o primeiro valor do
 * X-Forwarded-For). Por rota: um teto geral, bem mais alto, que protege o servidor de
 * quem troca de IP a cada tentativa.
 *
 * <p>Limitação conhecida: os contadores vivem em memória, então o limite efetivo
 * multiplica pelo número de instâncias.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final Duration WINDOW = Duration.ofMinutes(1);

    /** Contador parado há mais de uma janela já está cheio de novo: apagá-lo não muda nada. */
    private static final int MAX_COUNTERS = 50_000;

    private record Rule(int perVisitorMultiple, int routeWideMultiple) {
    }

    /** Casamento por sufixo: cobre "/api/v1/auth/login" (servidor) e "/auth/login" (MockMvc). */
    private static final Map<String, Rule> RULES = Map.of(
            "/auth/login", new Rule(1, 20),
            "/auth/forgot-password", new Rule(1, 10),
            "/auth/reset-password", new Rule(1, 20),
            "/auth/first-access", new Rule(1, 20));

    private record Counter(Bucket bucket, AtomicLong lastUse) {
    }

    private final Map<String, Counter> perVisitor = new ConcurrentHashMap<>();
    private final Map<String, Bucket> routeWide = new HashMap<>();
    private final AtomicBoolean cleaning = new AtomicBoolean(false);
    private final ObjectMapper mapper;
    private final ClientIpResolver clientIp;
    private final int limit;

    public RateLimitFilter(ObjectMapper mapper, ClientIpResolver clientIp,
                           @Value("${xp77.rate-limit.per-minute}") int limit) {
        this.mapper = mapper;
        this.clientIp = clientIp;
        this.limit = limit;
        RULES.forEach((route, rule) -> routeWide.put(route, bucket(limit * rule.routeWideMultiple())));
    }

    /** Limite por visitante, por minuto. */
    public int limit() {
        return limit;
    }

    /** Teto geral de uma rota, por minuto, somando todos os visitantes. */
    public int routeWideLimit(String route) {
        return limit * RULES.get(route).routeWideMultiple();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String route = RULES.keySet().stream().filter(uri::endsWith).findFirst().orElse(null);
        if (route == null) {
            chain.doFilter(request, response);
            return;
        }

        Rule rule = RULES.get(route);
        Counter counter = perVisitor.computeIfAbsent(route + "|" + clientIp.resolve(request),
                key -> new Counter(bucket(limit * rule.perVisitorMultiple()), new AtomicLong()));
        counter.lastUse().set(System.nanoTime());
        if (perVisitor.size() > MAX_COUNTERS) {
            cleanIdleCounters();
        }

        // Primeiro o do visitante: quem já estourou o próprio limite não gasta o teto geral.
        if (counter.bucket().tryConsume(1) && routeWide.get(route).tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }

        ErrorPayload payload = new ErrorPayload(
                ErrorCode.RATE_LIMIT_EXCEEDED.name(), "Limite de requisições excedido",
                ErrorCode.RATE_LIMIT_EXCEEDED.httpStatus(), request.getRequestURI(),
                MDC.get(TraceIdFilter.MDC_KEY), Instant.now().toString(), List.of());
        response.setStatus(ErrorCode.RATE_LIMIT_EXCEEDED.httpStatus());
        response.setHeader("Retry-After", String.valueOf(WINDOW.toSeconds()));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), ApiResponse.error(payload));
    }

    private static Bucket bucket(int capacity) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder().capacity(capacity).refillGreedy(capacity, WINDOW).build())
                .build();
    }

    /** Apaga contadores ociosos; se nem assim couber, zera tudo. Uma limpeza por vez. */
    private void cleanIdleCounters() {
        if (!cleaning.compareAndSet(false, true)) {
            return;
        }
        try {
            long cutoff = System.nanoTime() - WINDOW.toNanos();
            perVisitor.entrySet().removeIf(entry -> entry.getValue().lastUse().get() < cutoff);
            if (perVisitor.size() > MAX_COUNTERS) {
                log.warn("Contadores de limite acima de {} mesmo após a limpeza; zerando.", MAX_COUNTERS);
                perVisitor.clear();
            }
        } finally {
            cleaning.set(false);
        }
    }
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest=RateLimitFilterTest test`
Expected: código de saída 0, `Tests run: 7, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS`.

- [ ] **Passo 6: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src/main/resources os/backend/src/main/java/com/xp77/os/security/RateLimitFilter.java os/backend/src/test/java/com/xp77/os/security/RateLimitFilterTest.java
git commit -m "feat(security): rate-limit password routes by trusted client IP" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 13: V6 e auditoria (só inserção, por organização) com eventos de login

**Arquivos:**
- Create: `os/backend/src/main/resources/db/migration/V6__audit_logs.sql`
- Create: `os/backend/src/main/java/com/xp77/os/audit/api/AuditLogger.java`, `audit/entity/AuditLog.java`, `audit/repository/AuditLogRepository.java`, `audit/service/AuditLoggerImpl.java`
- Create: `os/backend/src/main/java/com/xp77/os/audit/web/RequestBodySummary.java` (porta de `ResumoDoCorpo`), `audit/web/AdminAuditInterceptor.java` (porta de `AuditoriaDoPainelInterceptor`), `audit/web/AdminRequestBodyCachingFilter.java` (porta de `CorpoDasAlteracoesDoPainelFilter`), `audit/web/AuditWebConfig.java` (porta de `AuditoriaWebConfig`)
- Create: `os/backend/src/main/java/com/xp77/os/audit/dto/AuditLogResponse.java`, `audit/controller/AdminAuditLogController.java`
- Modify: `os/backend/src/main/java/com/xp77/os/auth/service/AuthService.java`, `auth/service/RefreshTokenService.java`, `auth/service/PasswordResetService.java` (eventos de auditoria)
- Test: `os/backend/src/test/java/com/xp77/os/audit/web/RequestBodySummaryTest.java`, `os/backend/src/test/java/com/xp77/os/audit/AuditLoggerTest.java`, `audit/AdminAuditInterceptorTest.java`, `audit/AdminAuditLogsEndpointTest.java`, `os/backend/src/test/java/com/xp77/os/auth/AuthAuditTest.java`

**Interfaces:**
- Consumes: `OrgContext`, `RootOrganization` (Tarefa 5); `AuthenticatedUser`, `ClientIpResolver` (Tarefas 7 e 9); `PageRequestFactory`, `PageResponse` (Tarefa 2); `AuthService`, `RefreshTokenService`, `PasswordResetService` (Tarefas 8, 9 e 11); `TestAuth`, `TestData`.
- Produces:
  - Tabela `audit_logs` com RLS por organização; o papel `app_77xp` só faz `SELECT` e `INSERT`.
  - `interface AuditLogger` — `void record(String action, String entityType, String entityId, Map<String, Object> metadata)`, `void recordWithActor(UUID actorId, String action, String entityType, String entityId, Map<String, Object> metadata)`, `void recordResult(UUID actorId, String action, String entityType, String entityId, Map<String, Object> metadata, boolean success)`; constantes `AuditLogger.Actions.LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_REUSE_DETECTED`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `ADMIN_ACTION`. Grava na organização do `OrgContext` (sem organização: descarta com aviso), com IP confiável e aparelho da requisição corrente e, sem autor informado, quem está logado. Nunca propaga erro para quem chamou e sobrevive ao rollback de quem chamou (transação própria).
  - Todo `POST`/`PUT`/`PATCH`/`DELETE` em `/admin/**` vira um registro `ADMIN_ACTION` (rota, parâmetros, status e o corpo JSON de até 64 KB com campos sensíveis mascarados); resultado `FAILURE` quando o status é ≥ 400.
  - `GET /admin/audit-logs?action=A,B&page=&size=` → `PageResponse<AuditLogResponse>` (mais novos primeiro, só da organização do token).
  - `record AuditLogResponse(UUID id, UUID actorUserId, String action, String entityType, String entityId, String metadata, String ip, String userAgent, String result, Instant createdAt)` (`metadata` sai como JSON cru).

Correções em relação ao Beto_Banco: cada registro tem `org_id` e RLS; a gravação usa uma transação nova (`REQUIRES_NEW` via `TransactionTemplate`) — no Beto_Banco ela participava da transação de quem chamou, então uma falha de login desfeita apagava o registro, e um erro ao gravar marcava a transação de quem chamou para rollback; o IP vem do `ClientIpResolver`; falha de login, saída e reuso de sessão também são registrados.

> **Banco local:** a V6 é criada depois da V7 (Tarefa 10). Se você subiu a `api` com `docker compose` entre as Tarefas 10 e 13, o Flyway recusa a V6 "fora de ordem". Recrie o banco local: `docker compose -f os/docker-compose.yml down -v`. Os testes não são afetados (cada execução cria um banco novo).

- [ ] **Passo 1: Escrever os testes do resumo do corpo, do gravador e do registro automático (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/audit/web/RequestBodySummaryTest.java`:

```java
package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RequestBodySummaryTest {

    private final ObjectMapper mapper = new ObjectMapper();

    private Object summary(String json) {
        return RequestBodySummary.of(json.getBytes(StandardCharsets.UTF_8), false, mapper).orElseThrow();
    }

    @Test
    void secretLookingFieldsAreNotStored() {
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("""
                {"email":"a@b.com","novaSenha":"123456","refreshToken":"abc","credential":"x"}""");

        assertThat(fields).containsEntry("email", "a@b.com")
                .containsEntry("novaSenha", "(oculto)")
                .containsEntry("refreshToken", "(oculto)")
                .containsEntry("credential", "(oculto)");
    }

    @Test
    void longTextIsCutAndSaysHowLongItWas() {
        String longText = "x".repeat(1000);
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("{\"texto\":\"" + longText + "\"}");

        assertThat((String) fields.get("texto"))
                .startsWith("x".repeat(RequestBodySummary.MAX_TEXT))
                .endsWith("… (1000 caracteres)");
    }

    @Test
    void longListShowsTheFirstItemsAndCountsTheRest() {
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < 64; i++) {
            ids.append(i == 0 ? "" : ",").append(i);
        }
        @SuppressWarnings("unchecked")
        var fields = (Map<String, Object>) summary("{\"itens\":[" + ids + "]}");

        @SuppressWarnings("unchecked")
        var list = (List<Object>) fields.get("itens");
        assertThat(list).hasSize(RequestBodySummary.MAX_ITEMS + 1).last().isEqualTo("(mais 44)");
    }

    @Test
    void truncatedOrNonJsonBodyBecomesANotice() {
        assertThat(RequestBodySummary.of("{\"a\":".getBytes(StandardCharsets.UTF_8), true, mapper))
                .contains("(corpo grande demais para o registro)");
        assertThat(RequestBodySummary.of("nao e json".getBytes(StandardCharsets.UTF_8), false, mapper))
                .contains("(corpo que não é JSON)");
        assertThat(RequestBodySummary.of(new byte[0], false, mapper)).isEmpty();
    }

    @Test
    void theEntityComesFromTheRoute() {
        assertThat(AdminAuditInterceptor.entityOf("/admin/users/{id}/block", Map.of("id", "u-1")))
                .containsExactly("users", "u-1");
        assertThat(AdminAuditInterceptor.entityOf("/admin/leads/{id}/status/{novo}",
                Map.of("id", "lead-1", "novo", "WON"))).containsExactly("leads", "lead-1");
        assertThat(AdminAuditInterceptor.entityOf("/admin/users/invitations", Map.of()))
                .containsExactly("invitations", null);
    }
}
```

`os/backend/src/test/java/com/xp77/os/audit/AuditLoggerTest.java`:

```java
package com.xp77.os.audit;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuditLoggerTest extends PostgresTestBase {

    @Autowired
    private AuditLogger audit;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void clean() {
        RequestContextHolder.resetRequestAttributes();
        SecurityContextHolder.clearContext();
    }

    private long count(String entityId) {
        return ownerJdbc().queryForObject("select count(*) from audit_logs where entity_id = ?", Long.class, entityId);
    }

    @Test
    void recordsOrganizationActorTrustedIpAndDevice() {
        UUID org = TestData.createOrg("Auditada");
        UUID actor = UUID.randomUUID();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("User-Agent", "Navegador de teste");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(actor, org, "dono@exemplo.com", "OWNER"), null, List.of()));
        String entity = TestData.unique("registro");

        OrgContext.runAs(org, () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of("key", "valor")));

        assertThat(ownerJdbc().queryForMap("select org_id, actor_user_id, ip, user_agent, result, "
                + "metadata->>'key' as key from audit_logs where entity_id = ?", entity))
                .containsEntry("org_id", org)
                .containsEntry("actor_user_id", actor)
                .containsEntry("ip", "203.0.113.5")
                .containsEntry("user_agent", "Navegador de teste")
                .containsEntry("result", "SUCCESS")
                .containsEntry("key", "valor");
    }

    @Test
    void survivesTheRollbackOfTheCallersTransaction() {
        String entity = TestData.unique("rollback");

        OrgContext.runAs(RootOrganization.ID, () -> new TransactionTemplate(transactionManager)
                .executeWithoutResult(status -> {
                    audit.recordResult(null, "LOGIN_FAILED", "User", entity, Map.of(), false);
                    status.setRollbackOnly();
                }));

        assertThat(count(entity)).isEqualTo(1L);
    }

    @Test
    void withoutOrganizationTheEntryIsDroppedQuietly() {
        String entity = TestData.unique("sem-org");

        assertThatCode(() -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of())).doesNotThrowAnyException();
        assertThat(count(entity)).isZero();
    }

    @Test
    void aFailureToWriteNeverReachesTheCaller() {
        String entity = TestData.unique("falha");

        assertThatCode(() -> OrgContext.runAs(RootOrganization.ID,
                () -> audit.record(null, "Teste", entity, Map.of()))).doesNotThrowAnyException();
        assertThat(count(entity)).isZero();
    }

    @Test
    void theApplicationCannotChangeOrDeleteAuditEntries() {
        String entity = TestData.unique("imutavel");
        OrgContext.runAs(RootOrganization.ID, () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of()));
        TransactionTemplate tx = new TransactionTemplate(transactionManager);

        assertThatThrownBy(() -> OrgContext.runAs(RootOrganization.ID, () -> tx.executeWithoutResult(status ->
                jdbc.update("update audit_logs set action = 'ALTERADA' where entity_id = ?", entity))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("permission denied");
        assertThatThrownBy(() -> OrgContext.runAs(RootOrganization.ID, () -> tx.executeWithoutResult(status ->
                jdbc.update("delete from audit_logs where entity_id = ?", entity))))
                .isInstanceOf(DataAccessException.class)
                .hasStackTraceContaining("permission denied");
        assertThat(count(entity)).isEqualTo(1L);
    }
}
```

`os/backend/src/test/java/com/xp77/os/audit/AdminAuditInterceptorTest.java`:

```java
package com.xp77.os.audit;

import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Usa um controller só de teste sob /admin, porque a Fundação ainda não tem escrita no painel. */
@AutoConfigureMockMvc
class AdminAuditInterceptorTest extends PostgresTestBase {

    private static final String BROWSER = "Mozilla/5.0 (Windows NT 10.0) Chrome/131.0";

    @Autowired
    private MockMvc mockMvc;

    private Map<String, Object> adminEntry(String entityId) {
        return ownerJdbc().queryForMap("select actor_user_id, ip, user_agent, result, entity_type, "
                + "metadata->>'route' as route, (metadata->>'status')::int as status, "
                + "metadata->'body'->>'name' as name, metadata->'body'->>'password' as password "
                + "from audit_logs where action = 'ADMIN_ACTION' and entity_id = ?", entityId);
    }

    @Test
    void adminWriteIsRecordedWithActorIpDeviceAndMaskedBody() throws Exception {
        String email = TestData.uniqueEmail("admin-audit");
        UUID owner = TestAuth.rootMember(email, "OWNER");
        String item = TestData.unique("item");

        mockMvc.perform(post("/admin/test-audit/items/{itemId}", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .header("User-Agent", BROWSER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Item auditado\",\"password\":\"segredo\"}"))
                .andExpect(status().isCreated());

        assertThat(adminEntry(item))
                .containsEntry("actor_user_id", owner)
                .containsEntry("ip", "127.0.0.1")
                .containsEntry("user_agent", BROWSER)
                .containsEntry("result", "SUCCESS")
                .containsEntry("entity_type", "items")
                .containsEntry("route", "/admin/test-audit/items/{itemId}")
                .containsEntry("status", 201)
                .containsEntry("name", "Item auditado")
                .containsEntry("password", "(oculto)");
    }

    @Test
    void refusedAttemptIsRecordedAsFailure() throws Exception {
        String email = TestData.uniqueEmail("admin-recusa");
        TestAuth.rootMember(email, "ADMIN");
        String item = TestData.unique("item");

        mockMvc.perform(post("/admin/test-audit/items/{itemId}/recusar", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnprocessableEntity());

        assertThat(adminEntry(item)).containsEntry("result", "FAILURE").containsEntry("status", 422);
    }

    @Test
    void readsAreNotRecorded() throws Exception {
        String email = TestData.uniqueEmail("admin-leitura");
        TestAuth.rootMember(email, "OWNER");
        String item = TestData.unique("item");

        mockMvc.perform(get("/admin/test-audit/items/{itemId}", item)
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk());

        assertThat(ownerJdbc().queryForObject("select count(*) from audit_logs where action = 'ADMIN_ACTION' "
                + "and entity_id = ?", Long.class, item)).isZero();
    }

    @TestConfiguration
    static class TestAdminControllerConfig {
        @Bean
        TestAdminController testAdminController() {
            return new TestAdminController();
        }
    }

    @RestController
    @RequestMapping("/admin/test-audit/items")
    static class TestAdminController {

        @PostMapping("/{itemId}")
        ResponseEntity<Map<String, String>> create(@PathVariable String itemId, @RequestBody Map<String, Object> body) {
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", itemId));
        }

        @PostMapping("/{itemId}/recusar")
        void refuse(@PathVariable String itemId) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Dados inválidos");
        }

        @GetMapping("/{itemId}")
        Map<String, String> read(@PathVariable String itemId) {
            return Map.of("id", itemId);
        }
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='RequestBodySummaryTest,AuditLoggerTest,AdminAuditInterceptorTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `cannot find symbol` para `RequestBodySummary`, `AdminAuditInterceptor` e `AuditLogger`.

- [ ] **Passo 2: Escrever a V6, a API, a entidade, o gravador e as peças web**

`os/backend/src/main/resources/db/migration/V6__audit_logs.sql`:

```sql
-- V6: auditoria. Tabela de organização (RLS) e só de inserção para a aplicação.
CREATE TABLE audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id        UUID NOT NULL REFERENCES organizations (id),
    -- Sem chave estrangeira de propósito: o registro sobrevive à pessoa.
    actor_user_id UUID,
    action        TEXT NOT NULL,
    entity_type   TEXT,
    entity_id     TEXT,
    ip            TEXT,
    user_agent    TEXT,
    result        TEXT NOT NULL DEFAULT 'SUCCESS',
    metadata      JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_result_check CHECK (result IN ('SUCCESS', 'FAILURE'))
);

CREATE INDEX audit_logs_org_created_idx ON audit_logs (org_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_org_isolation ON audit_logs
    USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid)
    WITH CHECK (org_id = nullif(current_setting('app.org_id', true), '')::uuid);

-- Só inserção: as permissões padrão da V4 deram UPDATE e DELETE; aqui elas saem.
REVOKE UPDATE, DELETE ON audit_logs FROM app_77xp;
```

`os/backend/src/main/java/com/xp77/os/audit/api/AuditLogger.java`:

```java
package com.xp77.os.audit.api;

import java.util.Map;
import java.util.UUID;

/**
 * Contrato do módulo audit. Registrar nunca derruba a operação auditada: falha ao gravar
 * é engolida e reportada no log. Dentro de uma requisição, IP e aparelho vêm da própria
 * requisição e, sem autor informado, o autor é quem está logado. O registro vai para a
 * organização do OrgContext.
 */
public interface AuditLogger {

    void record(String action, String entityType, String entityId, Map<String, Object> metadata);

    void recordWithActor(UUID actorId, String action, String entityType, String entityId,
                         Map<String, Object> metadata);

    /** Como recordWithActor, dizendo se deu certo. Tentativa recusada também é rastro. */
    void recordResult(UUID actorId, String action, String entityType, String entityId,
                      Map<String, Object> metadata, boolean success);

    final class Actions {
        public static final String LOGIN = "LOGIN";
        public static final String LOGIN_FAILED = "LOGIN_FAILED";
        public static final String LOGOUT = "LOGOUT";
        public static final String SESSION_REUSE_DETECTED = "SESSION_REUSE_DETECTED";
        public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
        public static final String PASSWORD_RESET = "PASSWORD_RESET";
        /** Escrita em /admin/** registrada automaticamente pelo AdminAuditInterceptor. */
        public static final String ADMIN_ACTION = "ADMIN_ACTION";

        private Actions() {
        }
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/entity/AuditLog.java`:

```java
package com.xp77.os.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "org_id", nullable = false)
    private UUID orgId;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(nullable = false)
    private String action;

    @Column(name = "entity_type")
    private String entityType;

    @Column(name = "entity_id")
    private String entityId;

    private String ip;

    @Column(name = "user_agent")
    private String userAgent;

    @Column(nullable = false)
    private String result;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String metadata;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected AuditLog() {
    }

    public AuditLog(UUID orgId, UUID actorUserId, String action, String entityType, String entityId,
                    String metadata, String result) {
        this.orgId = orgId;
        this.actorUserId = actorUserId;
        this.action = action;
        this.entityType = entityType;
        this.entityId = entityId;
        this.metadata = metadata;
        this.result = result;
    }

    public UUID getId() {
        return id;
    }

    public UUID getOrgId() {
        return orgId;
    }

    public UUID getActorUserId() {
        return actorUserId;
    }

    public String getAction() {
        return action;
    }

    public String getEntityType() {
        return entityType;
    }

    public String getEntityId() {
        return entityId;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }

    public String getResult() {
        return result;
    }

    public String getMetadata() {
        return metadata;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/repository/AuditLogRepository.java`:

```java
package com.xp77.os.audit.repository;

import com.xp77.os.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.UUID;

public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByActionIn(Collection<String> actions, Pageable pageable);
}
```

`os/backend/src/main/java/com/xp77/os/audit/service/AuditLoggerImpl.java`:

```java
package com.xp77.os.audit.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.audit.entity.AuditLog;
import com.xp77.os.audit.repository.AuditLogRepository;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.ClientIpResolver;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuditLoggerImpl implements AuditLogger {

    /** Marca a requisição que já gravou um registro próprio: o automático não repete. */
    public static final String RECORDED_IN_THIS_REQUEST = AuditLoggerImpl.class.getName() + ".recorded";

    private static final int MAX_USER_AGENT = 300;

    private static final Logger log = LoggerFactory.getLogger(AuditLoggerImpl.class);

    private final AuditLogRepository repository;
    private final ObjectMapper mapper;
    private final ClientIpResolver clientIp;
    private final TransactionTemplate ownTransaction;

    public AuditLoggerImpl(AuditLogRepository repository, ObjectMapper mapper, ClientIpResolver clientIp,
                           PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.mapper = mapper;
        this.clientIp = clientIp;
        // Transação própria: o registro de uma falha sobrevive ao rollback de quem chamou,
        // e um erro ao gravar nunca marca a transação de quem chamou para rollback.
        this.ownTransaction = new TransactionTemplate(transactionManager);
        this.ownTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Override
    public void record(String action, String entityType, String entityId, Map<String, Object> metadata) {
        recordResult(null, action, entityType, entityId, metadata, true);
    }

    @Override
    public void recordWithActor(UUID actorId, String action, String entityType, String entityId,
                                Map<String, Object> metadata) {
        recordResult(actorId, action, entityType, entityId, metadata, true);
    }

    @Override
    public void recordResult(UUID actorId, String action, String entityType, String entityId,
                             Map<String, Object> metadata, boolean success) {
        Optional<UUID> orgId = OrgContext.current();
        if (orgId.isEmpty()) {
            log.warn("Auditoria de {} descartada: nenhuma organização no contexto", action);
            return;
        }
        try {
            String json = metadata == null || metadata.isEmpty() ? null : mapper.writeValueAsString(metadata);
            AuditLog entry = new AuditLog(orgId.get(), actorId != null ? actorId : currentUser(), action,
                    entityType, entityId, json, success ? "SUCCESS" : "FAILURE");
            Optional<HttpServletRequest> request = currentRequest();
            request.ifPresent(r -> {
                entry.setIp(clientIp.resolve(r));
                entry.setUserAgent(truncate(r.getHeader("User-Agent")));
            });
            ownTransaction.executeWithoutResult(status -> repository.saveAndFlush(entry));
            request.ifPresent(r -> r.setAttribute(RECORDED_IN_THIS_REQUEST, Boolean.TRUE));
        } catch (Exception e) {
            // Um registro perdido é ruim; uma operação perdida por causa dele seria pior.
            log.error("Falha ao gravar auditoria da ação {} sobre {} {}", action, entityType, entityId, e);
        }
    }

    /** Fora de uma requisição (processos em segundo plano) não há ninguém logado: autor vazio. */
    private static UUID currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user
                ? user.userId()
                : null;
    }

    private static Optional<HttpServletRequest> currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes
                ? Optional.of(attributes.getRequest())
                : Optional.empty();
    }

    private static String truncate(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }
        return userAgent.length() <= MAX_USER_AGENT ? userAgent : userAgent.substring(0, MAX_USER_AGENT);
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/web/RequestBodySummary.java`:

```java
package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * O que foi enviado numa alteração do painel, do tamanho que cabe num registro: texto
 * longo é cortado, lista longa mostra as primeiras e conta o resto, e campo com cara de
 * segredo não é gravado. Vale para toda rota nova de /admin, inclusive as que vierem.
 */
final class RequestBodySummary {

    static final int MAX_TEXT = 280;
    static final int MAX_ITEMS = 20;
    static final int MAX_DEPTH = 5;

    private static final Pattern SECRET_FIELD = Pattern.compile(
            "(?i).*(senha|password|token|secret|segredo|credential|hash|cpf|cartao|card).*");

    private RequestBodySummary() {
    }

    /** @param truncated o corpo passou do limite guardado, e o que sobrou não é JSON inteiro. */
    static Optional<Object> of(byte[] body, boolean truncated, ObjectMapper mapper) {
        if (body == null || body.length == 0) {
            return Optional.empty();
        }
        if (truncated) {
            return Optional.of("(corpo grande demais para o registro)");
        }
        try {
            return Optional.ofNullable(summarize(mapper.readTree(body), 0));
        } catch (IOException notJson) {
            return Optional.of("(corpo que não é JSON)");
        }
    }

    static Object summarize(JsonNode node, int depth) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return null;
        }
        if (depth > MAX_DEPTH) {
            return "(…)";
        }
        if (node.isObject()) {
            Map<String, Object> fields = new LinkedHashMap<>();
            for (Map.Entry<String, JsonNode> field : node.properties()) {
                fields.put(field.getKey(), SECRET_FIELD.matcher(field.getKey()).matches()
                        ? "(oculto)"
                        : summarize(field.getValue(), depth + 1));
            }
            return fields;
        }
        if (node.isArray()) {
            List<Object> items = new ArrayList<>();
            for (int i = 0; i < node.size() && i < MAX_ITEMS; i++) {
                items.add(summarize(node.get(i), depth + 1));
            }
            if (node.size() > MAX_ITEMS) {
                items.add("(mais " + (node.size() - MAX_ITEMS) + ")");
            }
            return items;
        }
        if (node.isTextual()) {
            String text = node.asText();
            return text.length() <= MAX_TEXT
                    ? text
                    : text.substring(0, MAX_TEXT) + "… (" + text.length() + " caracteres)";
        }
        if (node.isNumber()) {
            return node.numberValue();
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        return node.asText();
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/web/AdminAuditInterceptor.java`:

```java
package com.xp77.os.audit.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.audit.service.AuditLoggerImpl;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.WebUtils;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Registra toda alteração feita no painel (/admin/**), com quem fez, as de hoje e as
 * que forem criadas depois. Ação que já gravou um registro próprio não ganha um segundo
 * genérico. Tentativa recusada (status >= 400) também é registrada, como falha.
 */
@Component
public class AdminAuditInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AdminAuditInterceptor.class);

    private static final Set<String> WRITE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final AuditLogger audit;
    private final ObjectMapper mapper;

    public AdminAuditInterceptor(AuditLogger audit, ObjectMapper mapper) {
        this.audit = audit;
        this.mapper = mapper;
    }

    static boolean isWrite(String method) {
        return method != null && WRITE_METHODS.contains(method);
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        try {
            if (!isWrite(request.getMethod())
                    || Boolean.TRUE.equals(request.getAttribute(AuditLoggerImpl.RECORDED_IN_THIS_REQUEST))
                    || !(request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE) instanceof String route)
                    || !route.startsWith("/admin/")) {
                return;
            }

            @SuppressWarnings("unchecked")
            Map<String, String> variables = (Map<String, String>)
                    request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE);

            int status = response.getStatus();
            if (ex != null && status < 400) {
                status = 500;
            }

            Map<String, Object> details = new LinkedHashMap<>();
            details.put("method", request.getMethod());
            details.put("route", route);
            details.put("status", status);
            if (variables != null && !variables.isEmpty()) {
                details.put("params", variables);
            }
            body(request).ifPresent(summary -> details.put("body", summary));

            String[] entity = entityOf(route, variables);
            audit.recordResult(null, AuditLogger.Actions.ADMIN_ACTION, entity[0], entity[1], details, status < 400);
        } catch (RuntimeException e) {
            log.error("Falha ao registrar a alteração do painel {} {}", request.getMethod(), request.getRequestURI(), e);
        }
    }

    private Optional<Object> body(HttpServletRequest request) {
        ContentCachingRequestWrapper copy = WebUtils.getNativeRequest(request, ContentCachingRequestWrapper.class);
        if (copy == null) {
            return Optional.empty();
        }
        byte[] read = copy.getContentAsByteArray();
        boolean truncated = read.length >= AdminRequestBodyCachingFilter.MAX_BODY
                || request.getContentLengthLong() > read.length;
        return RequestBodySummary.of(read, truncated, mapper);
    }

    /**
     * O que foi alterado, tirado da rota: o identificador é a última variável cujo nome
     * termina em "id", e o tipo é o trecho antes dela. Sem variável de id, o tipo é o
     * último trecho fixo da rota.
     */
    static String[] entityOf(String route, Map<String, String> variables) {
        String[] parts = route.split("/");
        for (int i = parts.length - 1; i >= 0; i--) {
            String part = parts[i];
            if (part.startsWith("{") && part.endsWith("}")) {
                String name = part.substring(1, part.length() - 1);
                if (!name.toLowerCase(Locale.ROOT).endsWith("id")) {
                    continue;
                }
                String type = i > 0 && !parts[i - 1].startsWith("{") ? parts[i - 1] : name;
                String value = variables == null ? null : variables.get(name);
                return new String[] {type, value};
            }
        }
        String lastFixed = "";
        for (String part : parts) {
            if (!part.isEmpty() && !part.startsWith("{")) {
                lastFixed = part;
            }
        }
        return new String[] {lastFixed.isEmpty() ? route : lastFixed, null};
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/web/AdminRequestBodyCachingFilter.java`:

```java
package com.xp77.os.audit.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.util.Locale;

/**
 * Guarda uma cópia do corpo das alterações do painel (só JSON, só escrita): o corpo só
 * pode ser lido uma vez, por quem trata a rota, e o AdminAuditInterceptor lê a cópia depois.
 */
@Component
public class AdminRequestBodyCachingFilter extends OncePerRequestFilter {

    /** Acima disso o corpo não é guardado inteiro, e o registro avisa que cortou. */
    static final int MAX_BODY = 64 * 1024;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String type = request.getContentType();
        return !AdminAuditInterceptor.isWrite(request.getMethod())
                || !request.getRequestURI().contains("/admin/")
                || type == null
                || !type.toLowerCase(Locale.ROOT).contains("json");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        chain.doFilter(new ContentCachingRequestWrapper(request, MAX_BODY), response);
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/web/AuditWebConfig.java`:

```java
package com.xp77.os.audit.web;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Liga o registro automático a todas as rotas do painel. */
@Configuration
public class AuditWebConfig implements WebMvcConfigurer {

    private final AdminAuditInterceptor interceptor;

    public AuditWebConfig(AdminAuditInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/admin/**");
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='RequestBodySummaryTest,AuditLoggerTest,AdminAuditInterceptorTest' test`
Expected: código de saída 0, `Tests run: 13, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 3: Escrever os testes da consulta e dos eventos de login (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/audit/AdminAuditLogsEndpointTest.java`:

```java
package com.xp77.os.audit;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminAuditLogsEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditLogger audit;

    private String tokenFor(String role) throws Exception {
        String email = TestData.uniqueEmail("auditoria-" + role.toLowerCase());
        TestAuth.rootMember(email, role);
        return "Bearer " + TestAuth.accessToken(mockMvc, email);
    }

    private String listAdminActions() throws Exception {
        return mockMvc.perform(get("/admin/audit-logs").param("action", "ADMIN_ACTION").param("size", "100")
                        .header("Authorization", tokenFor("OWNER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.pagination.page").value(0))
                .andExpect(jsonPath("$.pagination.size").value(100))
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void ownerListsTheOrganizationsEntriesFilteredByAction() throws Exception {
        String entity = TestData.unique("auditavel");
        OrgContext.runAs(RootOrganization.ID,
                () -> audit.record("ADMIN_ACTION", "Teste", entity, Map.of("origem", "teste")));

        String json = listAdminActions();

        assertThat(JsonPath.<List<String>>read(json, "$.data[*].action")).containsOnly("ADMIN_ACTION");
        assertThat(JsonPath.<List<String>>read(json, "$.data[*].entityId")).contains(entity);
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.entityId == '" + entity + "')].metadata.origem"))
                .containsExactly("teste");
    }

    @Test
    void entriesOfAnotherOrganizationNeverShowUp() throws Exception {
        UUID other = TestData.createOrg("Outra organização");
        String entity = TestData.unique("alheio");
        ownerJdbc().update("insert into audit_logs (org_id, action, entity_type, entity_id) "
                + "values (?, 'ADMIN_ACTION', 'Teste', ?)", other, entity);

        assertThat(JsonPath.<List<String>>read(listAdminActions(), "$.data[*].entityId")).doesNotContain(entity);
    }

    @Test
    void teamAndClientCannotReadTheAudit() throws Exception {
        mockMvc.perform(get("/admin/audit-logs").header("Authorization", tokenFor("TEAM")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/audit-logs").header("Authorization", tokenFor("CLIENT")))
                .andExpect(status().isForbidden());
    }
}
```

`os/backend/src/test/java/com/xp77/os/auth/AuthAuditTest.java`:

```java
package com.xp77.os.auth;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Login, falha de login, saída, reuso de sessão e senha aparecem na auditoria. */
@AutoConfigureMockMvc
class AuthAuditTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    private List<Map<String, Object>> entries(String action, UUID user) {
        return ownerJdbc().queryForList("select result, org_id, actor_user_id, metadata::text as metadata "
                + "from audit_logs where action = ? and entity_id = ? order by created_at", action, user.toString());
    }

    @Test
    void successfulAndFailedLoginsAreRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-login");
        UUID user = TestAuth.rootMember(email, "TEAM");

        TestAuth.login(mockMvc, email, "senha-errada-1");
        TestAuth.login(mockMvc, email, TestAuth.PASSWORD);

        List<Map<String, Object>> failed = entries("LOGIN_FAILED", user);
        assertThat(failed).hasSize(1);
        assertThat(failed.get(0)).containsEntry("result", "FAILURE").containsEntry("org_id", RootOrganization.ID);
        assertThat((String) failed.get(0).get("metadata")).contains(email);
        assertThat(entries("LOGIN", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("result", "SUCCESS").containsEntry("actor_user_id", user));
    }

    @Test
    void logoutIsRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-sair");
        UUID user = TestAuth.rootMember(email, "TEAM");

        mockMvc.perform(post("/auth/logout").cookie(TestAuth.refreshCookie(mockMvc, email)))
                .andExpect(status().isNoContent());

        assertThat(entries("LOGOUT", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("actor_user_id", user));
    }

    @Test
    void refreshTokenReuseIsRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-reuso");
        UUID user = TestAuth.rootMember(email, "TEAM");
        Cookie first = TestAuth.refreshCookie(mockMvc, email);
        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isOk());

        mockMvc.perform(post("/auth/refresh").cookie(first)).andExpect(status().isUnauthorized());

        assertThat(entries("SESSION_REUSE_DETECTED", user)).singleElement()
                .satisfies(entry -> assertThat(entry).containsEntry("result", "FAILURE"));
    }

    @Test
    void passwordChangeAndResetAreRecorded() throws Exception {
        String email = TestData.uniqueEmail("audit-senha");
        UUID user = TestAuth.rootMember(email, "ADMIN");
        mockMvc.perform(post("/auth/change-password")
                        .header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"" + TestAuth.PASSWORD + "\",\"newPassword\":\"nova-senha-456\"}"))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isNoContent());
        String token = ownerJdbc().queryForObject("select payload->>'token' from email_outbox "
                + "where to_address = ? and template = 'REDEFINIR_SENHA'", String.class, email);
        MvcResult reset = mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"password\":\"outra-senha-789\"}"))
                .andReturn();

        assertThat(reset.getResponse().getStatus()).isEqualTo(204);
        assertThat(entries("PASSWORD_CHANGED", user)).hasSize(1);
        assertThat(entries("PASSWORD_RESET", user)).singleElement()
                .satisfies(entry -> assertThat((String) entry.get("metadata")).contains("esqueci minha senha"));
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='AdminAuditLogsEndpointTest,AuthAuditTest' test`
Expected: código de saída 1, `BUILD FAILURE`, com falhas: `/admin/audit-logs` responde 404 (não existe) e não há registros de `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `SESSION_REUSE_DETECTED`, `PASSWORD_CHANGED` nem `PASSWORD_RESET` (`EmptyResultDataAccessException`/listas vazias).

- [ ] **Passo 4: Escrever a consulta da auditoria**

`os/backend/src/main/java/com/xp77/os/audit/dto/AuditLogResponse.java`:

```java
package com.xp77.os.audit.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.xp77.os.audit.entity.AuditLog;

import java.time.Instant;
import java.util.UUID;

/** Um registro da auditoria. actorUserId nulo = ação do sistema; metadata sai como JSON. */
public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String action,
        String entityType,
        String entityId,
        @JsonRawValue String metadata,
        String ip,
        String userAgent,
        String result,
        Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getAction(), log.getEntityType(),
                log.getEntityId(), log.getMetadata(), log.getIp(), log.getUserAgent(), log.getResult(),
                log.getCreatedAt());
    }
}
```

`os/backend/src/main/java/com/xp77/os/audit/controller/AdminAuditLogController.java`:

```java
package com.xp77.os.audit.controller;

import com.xp77.os.audit.dto.AuditLogResponse;
import com.xp77.os.audit.entity.AuditLog;
import com.xp77.os.audit.repository.AuditLogRepository;
import com.xp77.os.shared.pagination.PageRequestFactory;
import com.xp77.os.shared.response.PageResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/** Auditoria é só leitura: não existe escrita aqui. O RLS limita à organização do token. */
@RestController
@RequestMapping("/admin/audit-logs")
public class AdminAuditLogController {

    private final AuditLogRepository logs;

    public AdminAuditLogController(AuditLogRepository logs) {
        this.logs = logs;
    }

    /** @param action uma ação, ou várias separadas por vírgula. */
    @GetMapping
    public ResponseEntity<PageResponse<AuditLogResponse>> list(
            @RequestParam(value = "action", required = false) String action,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size) {

        Pageable base = PageRequestFactory.of(page, size, null);
        Pageable paging = PageRequest.of(base.getPageNumber(), base.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        List<String> actions = action == null ? List.of() : Arrays.stream(action.split(","))
                .map(String::trim).filter(value -> !value.isEmpty()).toList();

        Page<AuditLog> found = actions.isEmpty() ? logs.findAll(paging) : logs.findByActionIn(actions, paging);
        return ResponseEntity.ok(PageResponse.from(found.map(AuditLogResponse::from)));
    }
}
```

- [ ] **Passo 5: Registrar os eventos de login, sessão e senha**

Trocar o conteúdo inteiro de `os/backend/src/main/java/com/xp77/os/auth/service/AuthService.java` por:

```java
package com.xp77.os.auth.service;

import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.auth.service.RefreshTokenService.Rotation;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.security.JwtService;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Orquestra login, renovação, saída e troca de senha. Sem @Transactional aqui de
 * propósito: cada chamada aos diretórios e às sessões abre a própria transação, e a
 * renovação precisa trocar de organização (OrgContext.callAs) entre uma e outra.
 */
@Service
public class AuthService {

    /** Mensagem única para qualquer falha: diferenciar os casos enumeraria contas. */
    public static final String INVALID_CREDENTIALS = "E-mail ou senha inválidos.";
    public static final String INVALID_SESSION = "Sessão inválida ou expirada";

    public record IssuedTokens(String accessToken, String refreshToken, long expiresInSeconds) {
    }

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final RefreshTokenService refreshTokens;
    private final JwtService jwt;
    private final AuditLogger audit;

    public AuthService(UserDirectory users, MembershipDirectory memberships,
                       RefreshTokenService refreshTokens, JwtService jwt, AuditLogger audit) {
        this.users = users;
        this.memberships = memberships;
        this.refreshTokens = refreshTokens;
        this.jwt = jwt;
        this.audit = audit;
    }

    /** Organização = a do domínio da requisição (OrgContextFilter). */
    public IssuedTokens login(String email, String password, Origin origin) {
        UUID orgId = OrgContext.current()
                .orElseThrow(() -> new IllegalStateException("Login sem organização no contexto"));
        Optional<UserAccount> account = users.verifyCredentials(email, password);
        Optional<MembershipRole> role = account.flatMap(a -> memberships.activeRoleOf(a.id(), orgId));
        if (role.isEmpty()) {
            recordFailedLogin(email, account);
            throw new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        UserAccount user = account.get();
        memberships.recordLogin(user.id(), orgId);
        String refresh = refreshTokens.issue(user.id(), orgId, origin);
        audit.recordWithActor(user.id(), AuditLogger.Actions.LOGIN, "User", user.id().toString(),
                Map.of("method", "password"));
        return new IssuedTokens(jwt.generate(user.id(), orgId, user.email(), role.get().name()),
                refresh, jwt.lifetimeSeconds());
    }

    /** O tipo de conta é relido na organização da sessão: vínculo bloqueado não renova. */
    public IssuedTokens refresh(String refreshValue, Origin origin) {
        Rotation rotation = refreshTokens.rotate(refreshValue, origin).orElseThrow(AuthService::invalidSession);
        Optional<MembershipRole> role = OrgContext.callAs(rotation.orgId(),
                () -> memberships.activeRoleOf(rotation.userId(), rotation.orgId()));
        if (role.isEmpty()) {
            refreshTokens.revoke(rotation.newValue());
            throw invalidSession();
        }
        return new IssuedTokens(jwt.generate(rotation.userId(), rotation.orgId(), rotation.email(), role.get().name()),
                rotation.newValue(), jwt.lifetimeSeconds());
    }

    public void logout(String refreshValue) {
        refreshTokens.revoke(refreshValue).ifPresent(owner ->
                audit.recordWithActor(owner, AuditLogger.Actions.LOGOUT, "User", owner.toString(), Map.of()));
    }

    /** A pessoa do token, se ainda estiver ativa e com vínculo ativo na organização do token. */
    public UserAccount currentAccount(AuthenticatedUser user) {
        if (memberships.activeRoleOf(user.userId(), user.orgId()).isEmpty()) {
            throw invalidSession();
        }
        return users.findActiveById(user.userId()).orElseThrow(AuthService::invalidSession);
    }

    /** O e-mail conferido vem do token, nunca do corpo. Todas as sessões caem depois. */
    public void changePassword(AuthenticatedUser user, String currentPassword, String newPassword) {
        users.verifyCredentials(user.email(), currentPassword)
                .filter(account -> account.id().equals(user.userId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "Senha atual incorreta."));
        users.setPassword(user.userId(), newPassword);
        refreshTokens.revokeAll(user.userId());
        audit.recordWithActor(user.userId(), AuditLogger.Actions.PASSWORD_CHANGED, "User",
                user.userId().toString(), Map.of("via", "troca de senha logado"));
    }

    /** Tentativa recusada também é rastro: a conta visada (se o e-mail existe) e o e-mail digitado. */
    private void recordFailedLogin(String email, Optional<UserAccount> account) {
        String typed = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        UUID target = account.map(UserAccount::id)
                .orElseGet(() -> users.findByEmail(typed).map(UserAccount::id).orElse(null));
        audit.recordResult(null, AuditLogger.Actions.LOGIN_FAILED, "User",
                target == null ? null : target.toString(), Map.of("email", typed), false);
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, INVALID_SESSION);
    }
}
```

Em `os/backend/src/main/java/com/xp77/os/auth/service/RefreshTokenService.java`:

trocar

```java
import com.xp77.os.auth.entity.RefreshToken;
```

por

```java
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.entity.RefreshToken;
```

trocar

```java
import java.util.List;
```

por

```java
import java.util.List;
import java.util.Map;
```

trocar

```java
    private final RefreshTokenRepository tokens;
    private final UserDirectory users;
    private final Duration lifetime;
    private final int maxActiveSessions;

    public RefreshTokenService(RefreshTokenRepository tokens,
                               UserDirectory users,
                               @Value("${xp77.auth.refresh-token-days}") long days,
                               @Value("${xp77.auth.max-active-sessions}") int maxActiveSessions) {
        this.tokens = tokens;
        this.users = users;
        this.lifetime = Duration.ofDays(days);
        this.maxActiveSessions = maxActiveSessions;
    }
```

por

```java
    private final RefreshTokenRepository tokens;
    private final UserDirectory users;
    private final AuditLogger audit;
    private final Duration lifetime;
    private final int maxActiveSessions;

    public RefreshTokenService(RefreshTokenRepository tokens,
                               UserDirectory users,
                               AuditLogger audit,
                               @Value("${xp77.auth.refresh-token-days}") long days,
                               @Value("${xp77.auth.max-active-sessions}") int maxActiveSessions) {
        this.tokens = tokens;
        this.users = users;
        this.audit = audit;
        this.lifetime = Duration.ofDays(days);
        this.maxActiveSessions = maxActiveSessions;
    }
```

e trocar

```java
            tokens.revokeAllActive(current.getUserId(), Instant.now());
            return Optional.empty();
```

por

```java
            tokens.revokeAllActive(current.getUserId(), Instant.now());
            audit.recordResult(current.getUserId(), AuditLogger.Actions.SESSION_REUSE_DETECTED, "User",
                    current.getUserId().toString(), Map.of("family", current.getFamilyId().toString()), false);
            return Optional.empty();
```

Em `os/backend/src/main/java/com/xp77/os/auth/service/PasswordResetService.java`:

trocar

```java
import com.xp77.os.auth.api.FirstAccessTokens;
```

por

```java
import com.xp77.os.audit.api.AuditLogger;
import com.xp77.os.auth.api.FirstAccessTokens;
```

trocar

```java
    private final EmailService emails;
    private final long firstAccessHours;
    private final long resetHours;

    public PasswordResetService(PasswordResetTokenRepository tokens,
                                UserDirectory users,
                                RefreshTokenService sessions,
                                EmailService emails,
                                @Value("${xp77.auth.first-access-token-hours}") long firstAccessHours,
                                @Value("${xp77.auth.reset-token-hours}") long resetHours) {
        this.tokens = tokens;
        this.users = users;
        this.sessions = sessions;
        this.emails = emails;
```

por

```java
    private final EmailService emails;
    private final AuditLogger audit;
    private final long firstAccessHours;
    private final long resetHours;

    public PasswordResetService(PasswordResetTokenRepository tokens,
                                UserDirectory users,
                                RefreshTokenService sessions,
                                EmailService emails,
                                AuditLogger audit,
                                @Value("${xp77.auth.first-access-token-hours}") long firstAccessHours,
                                @Value("${xp77.auth.reset-token-hours}") long resetHours) {
        this.tokens = tokens;
        this.users = users;
        this.sessions = sessions;
        this.emails = emails;
        this.audit = audit;
```

e trocar

```java
        tokens.saveAndFlush(token);
        sessions.revokeAll(token.getUserId());
    }
```

por

```java
        tokens.saveAndFlush(token);
        sessions.revokeAll(token.getUserId());
        audit.recordWithActor(token.getUserId(), AuditLogger.Actions.PASSWORD_RESET, "User",
                token.getUserId().toString(),
                Map.of("via", purpose == TokenPurpose.FIRST_ACCESS ? "primeiro acesso" : "esqueci minha senha"));
    }
```

- [ ] **Passo 6: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='AdminAuditLogsEndpointTest,AuthAuditTest' test`
Expected: código de saída 0, `Tests run: 7, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 7: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS` (as regras do ArchUnit agora cobrem também `audit`).

- [ ] **Passo 8: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/resources/db/migration/V6__audit_logs.sql os/backend/src/main/java/com/xp77/os/audit os/backend/src/main/java/com/xp77/os/auth/service os/backend/src/test/java/com/xp77/os/audit os/backend/src/test/java/com/xp77/os/auth/AuthAuditTest.java
git commit -m "feat(audit): add insert-only per-organization audit log with admin interceptor and auth events" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 14: Contas de acesso e Área do cliente (API)

**Arquivos:**
- Create: `os/backend/src/main/java/com/xp77/os/organizations/api/OrganizationSummary.java`, `organizations/api/OrganizationDirectory.java`, `organizations/service/OrganizationDirectoryService.java`
- Create: `os/backend/src/main/java/com/xp77/os/auth/api/SessionRevocation.java`, `auth/service/SessionRevocationService.java`
- Create: `os/backend/src/main/java/com/xp77/os/accounts/dto/InvitationRequest.java`, `accounts/dto/MemberResponse.java`, `accounts/dto/PortalMeResponse.java`
- Create: `os/backend/src/main/java/com/xp77/os/accounts/service/AccountsService.java`
- Create: `os/backend/src/main/java/com/xp77/os/accounts/controller/AdminUsersController.java`, `accounts/controller/PortalController.java`
- Test: `os/backend/src/test/java/com/xp77/os/accounts/AdminUsersEndpointTest.java`, `accounts/BlockRevokesSessionsTest.java`, `accounts/PortalEndpointTest.java`

**Interfaces:**
- Consumes: `UserDirectory` (`findByEmail`, `createWithoutPassword`, `findActiveById`), `MembershipDirectory` (`findMember`, `listMembers`, `grant`, `block`, `unblock`, `activeRoleOf`), `MemberSummary`, `MembershipRole`, `UserAccount` (Tarefa 6); `FirstAccessTokens` e o template `CONVITE` (Tarefa 11); `EmailService` (Tarefa 10); `RefreshTokenService.revokeAll` (Tarefa 8); `AuthenticatedUser` (Tarefa 7); `OrganizationRepository` (Tarefa 4); a auditoria automática de `/admin/**` (Tarefa 13); `TestAuth`, `TestData`.
- Produces:
  - `record OrganizationSummary(UUID id, String name, String slug)`; `interface OrganizationDirectory` — `Optional<OrganizationSummary> find(UUID id)`.
  - `interface SessionRevocation` (`auth.api`) — `void revokeAllSessions(UUID userId)`.
  - `AccountsService` (módulo novo `accounts`) — `MemberSummary invite(AuthenticatedUser actor, String email, String name, MembershipRole role)`, `List<MemberSummary> list(AuthenticatedUser actor)`, `void resendInvitation(AuthenticatedUser actor, UUID userId)`, `void block(AuthenticatedUser actor, UUID userId)`, `void unblock(AuthenticatedUser actor, UUID userId)`.
  - Rotas (só `OWNER`/`ADMIN`): `POST /admin/users/invitations {email, name, role}` → 201 `ApiResponse<MemberResponse>`; `GET /admin/users` → 200 `ApiResponse<List<MemberResponse>>`; `POST /admin/users/{id}/invitation` → 204; `POST /admin/users/{id}/block` → 204; `POST /admin/users/{id}/unblock` → 204.
  - Rota (só `CLIENT`): `GET /portal/me` → 200 `ApiResponse<PortalMeResponse>`.
  - `record MemberResponse(UUID id, String email, String name, String role, String status, Instant lastLoginAt)` com `status` `PENDING` (aguardando primeiro acesso), `ACTIVE` ou `BLOCKED`; `record PortalMeResponse(String name, String email, String organizationName)`; `record InvitationRequest(String email, String name, MembershipRole role)`.

Regras (spec, "Contas de acesso (convites) e Área do cliente", D10):
- Ninguém convida `OWNER` nem altera a conta do `OWNER` por aqui; só o `OWNER` convida, reenvia, bloqueia ou desbloqueia um `ADMIN`; o `ADMIN` cuida de `TEAM` e `CLIENT`. Violação → 403 `FORBIDDEN`.
- E-mail que já tem vínculo nesta organização → 409 `CONFLICT` ("Este e-mail já tem acesso nesta organização.").
- Convite cria a pessoa (sem senha) se o e-mail não existe, cria o vínculo e enfileira o e-mail `CONVITE` com um link `FIRST_ACCESS` de 72 h, tudo numa transação. Quem já tem senha (conta de outra organização) recebe o convite sem link, só com o aviso para entrar com a senha dela.
- Reenviar gera um link novo e invalida o anterior (`FirstAccessTokens.issueFor`).
- Bloquear vale para o vínculo nesta organização e revoga na hora todas as sessões (refresh tokens) da pessoa; ninguém bloqueia a si mesmo nem o `OWNER`. O login naquela organização passa a responder 401 (Tarefa 9). Access tokens já emitidos continuam válidos até expirar (no máximo 15 min); `/auth/me` e `/portal/me` já recusam o vínculo bloqueado.
- Cada `POST` destas rotas vira um registro `ADMIN_ACTION` pela auditoria automática (Tarefa 13).
- Fronteiras: `accounts` só usa os pacotes `api/` dos outros módulos (o ArchUnit da Tarefa 3 descobre o módulo novo sozinho).

- [ ] **Passo 1: Escrever os testes (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/accounts/AdminUsersEndpointTest.java`:

```java
package com.xp77.os.accounts;

import com.jayway.jsonpath.JsonPath;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class AdminUsersEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    private record Actor(UUID id, String bearer) {
    }

    private Actor actor(String role) throws Exception {
        String email = TestData.uniqueEmail("contas-" + role.toLowerCase());
        UUID id = TestAuth.rootMember(email, role);
        return new Actor(id, "Bearer " + TestAuth.accessToken(mockMvc, email));
    }

    private ResultActions invite(Actor actor, String email, String name, String role) throws Exception {
        return mockMvc.perform(post("/admin/users/invitations").header("Authorization", actor.bearer())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"name\":\"" + name + "\",\"role\":\"" + role + "\"}"));
    }

    private ResultActions action(Actor actor, String action, UUID target) throws Exception {
        return mockMvc.perform(post("/admin/users/{id}/" + action, target).header("Authorization", actor.bearer()));
    }

    private UUID userIdOf(String email) {
        return ownerJdbc().queryForObject("select id from users where email = ?", UUID.class, email);
    }

    private List<Map<String, Object>> invitationsTo(String email) {
        return ownerJdbc().queryForList("select payload->>'role' as role, payload->>'token' as token "
                + "from email_outbox where to_address = ? and template = 'CONVITE' order by created_at", email);
    }

    private ResultActions firstAccess(String token, String password) throws Exception {
        return mockMvc.perform(post("/auth/first-access").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"password\":\"" + password + "\"}"));
    }

    @Test
    void ownerInvitesAClientWhoCreatesThePasswordAndEntersAsClient() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("cliente");

        invite(owner, email, "Cliente Teste", "CLIENT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.name").value("Cliente Teste"))
                .andExpect(jsonPath("$.data.role").value("CLIENT"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        List<Map<String, Object>> sent = invitationsTo(email);
        assertThat(sent).singleElement().satisfies(mail -> assertThat(mail).containsEntry("role", "CLIENT"));
        firstAccess((String) sent.get(0).get("token"), "senha-do-cliente-1").andExpect(status().isNoContent());

        MvcResult login = TestAuth.login(mockMvc, email, "senha-do-cliente-1");
        assertThat(login.getResponse().getStatus()).isEqualTo(200);
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.data.accessToken");
        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.data.role").value("CLIENT"));
    }

    @Test
    void nobodyInvitesAnOwner() throws Exception {
        invite(actor("OWNER"), TestData.uniqueEmail("outro-dono"), "Outro Dono", "OWNER")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void onlyTheOwnerInvitesAnAdmin() throws Exception {
        invite(actor("ADMIN"), TestData.uniqueEmail("admin-por-admin"), "Admin", "ADMIN")
                .andExpect(status().isForbidden());
        invite(actor("OWNER"), TestData.uniqueEmail("admin-por-dono"), "Admin", "ADMIN")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("ADMIN"));
    }

    @Test
    void adminInvitesTeamAndClient() throws Exception {
        Actor admin = actor("ADMIN");

        invite(admin, TestData.uniqueEmail("equipe"), "Equipe", "TEAM").andExpect(status().isCreated());
        invite(admin, TestData.uniqueEmail("cliente"), "Cliente", "CLIENT").andExpect(status().isCreated());
    }

    @Test
    void anEmailThatAlreadyHasAccessHereIsAConflict() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("repetido");
        invite(owner, email, "Primeiro", "TEAM").andExpect(status().isCreated());

        invite(owner, email.toUpperCase(), "Segundo", "CLIENT")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.message").value("Este e-mail já tem acesso nesta organização."));
    }

    @Test
    void someoneWhoAlreadyHasAPasswordGetsTheInvitationWithoutALink() throws Exception {
        String email = TestData.uniqueEmail("ja-tem-senha");
        UUID person = TestData.createUser(email, TestData.hash("senha-de-outra-org"));
        TestData.addMembership(person, TestData.createOrg("Outra organização"), "TEAM");

        invite(actor("OWNER"), email, "Pessoa", "TEAM")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

        assertThat(invitationsTo(email)).singleElement().satisfies(mail -> assertThat(mail.get("token")).isNull());
    }

    @Test
    void listShowsTypeStatusAndLastAccess() throws Exception {
        Actor owner = actor("OWNER");
        String pending = TestData.uniqueEmail("pendente");
        invite(owner, pending, "Pendente", "CLIENT").andExpect(status().isCreated());
        String active = TestData.uniqueEmail("ativo");
        TestAuth.rootMember(active, "TEAM");
        TestAuth.login(mockMvc, active, TestAuth.PASSWORD);
        String blocked = TestData.uniqueEmail("bloqueado");
        action(owner, "block", TestAuth.rootMember(blocked, "TEAM")).andExpect(status().isNoContent());

        String json = mockMvc.perform(get("/admin/users").header("Authorization", owner.bearer()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + pending + "')].status"))
                .containsExactly("PENDING");
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + active + "')].status"))
                .containsExactly("ACTIVE");
        assertThat(JsonPath.<List<Object>>read(json, "$.data[?(@.email == '" + active + "')].lastLoginAt"))
                .singleElement().isNotNull();
        assertThat(JsonPath.<List<String>>read(json, "$.data[?(@.email == '" + blocked + "')].status"))
                .containsExactly("BLOCKED");
    }

    @Test
    void resendingTheInvitationInvalidatesThePreviousLink() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("reenvio");
        invite(owner, email, "Reenvio", "TEAM").andExpect(status().isCreated());

        action(owner, "invitation", userIdOf(email)).andExpect(status().isNoContent());

        List<Map<String, Object>> sent = invitationsTo(email);
        assertThat(sent).hasSize(2);
        firstAccess((String) sent.get(0).get("token"), "senha-forte-123").andExpect(status().isBadRequest());
        firstAccess((String) sent.get(1).get("token"), "senha-forte-123").andExpect(status().isNoContent());
    }

    @Test
    void blockingEndsSessionsAndPreventsLoginAndUnblockingRestoresIt() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("sessao-bloqueio");
        UUID member = TestAuth.rootMember(email, "TEAM");
        Cookie session = TestAuth.refreshCookie(mockMvc, email);

        action(owner, "block", member).andExpect(status().isNoContent());

        mockMvc.perform(post("/auth/refresh").cookie(session)).andExpect(status().isUnauthorized());
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(401);

        action(owner, "unblock", member).andExpect(status().isNoContent());
        assertThat(TestAuth.login(mockMvc, email, TestAuth.PASSWORD).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void nobodyBlocksThemselvesOrTheOwnerAndOnlyTheOwnerBlocksAnAdmin() throws Exception {
        Actor owner = actor("OWNER");
        Actor admin = actor("ADMIN");
        Actor otherAdmin = actor("ADMIN");

        action(owner, "block", owner.id()).andExpect(status().isForbidden());
        action(admin, "block", owner.id()).andExpect(status().isForbidden());
        action(admin, "block", otherAdmin.id()).andExpect(status().isForbidden());
        action(owner, "block", otherAdmin.id()).andExpect(status().isNoContent());
    }

    @Test
    void unknownAccountIsNotFound() throws Exception {
        action(actor("OWNER"), "block", UUID.randomUUID())
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    void teamAndClientCannotManageAccounts() throws Exception {
        mockMvc.perform(get("/admin/users").header("Authorization", actor("TEAM").bearer()))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/admin/users").header("Authorization", actor("CLIENT").bearer()))
                .andExpect(status().isForbidden());
    }

    @Test
    void accountChangesAreAudited() throws Exception {
        Actor owner = actor("OWNER");
        String email = TestData.uniqueEmail("auditado");
        invite(owner, email, "Auditado", "CLIENT").andExpect(status().isCreated());
        UUID invited = userIdOf(email);
        action(owner, "block", invited).andExpect(status().isNoContent());

        assertThat(ownerJdbc().queryForMap("select actor_user_id, result from audit_logs "
                + "where action = 'ADMIN_ACTION' and metadata->>'route' = '/admin/users/invitations' "
                + "and metadata->'body'->>'email' = ?", email))
                .containsEntry("actor_user_id", owner.id()).containsEntry("result", "SUCCESS");
        assertThat(ownerJdbc().queryForMap("select entity_type, result from audit_logs "
                + "where action = 'ADMIN_ACTION' and entity_id = ?", invited.toString()))
                .containsEntry("entity_type", "users").containsEntry("result", "SUCCESS");
    }
}
```

`os/backend/src/test/java/com/xp77/os/accounts/BlockRevokesSessionsTest.java`:

```java
package com.xp77.os.accounts;

import com.xp77.os.accounts.service.AccountsService;
import com.xp77.os.auth.service.RefreshTokenService;
import com.xp77.os.auth.service.RefreshTokenService.Origin;
import com.xp77.os.organizations.api.OrgContext;
import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Bloquear derruba na hora todas as sessões da pessoa (os refresh tokens de todos os aparelhos). */
class BlockRevokesSessionsTest extends PostgresTestBase {

    @Autowired
    private AccountsService accounts;

    @Autowired
    private RefreshTokenService sessions;

    @Test
    void blockingEndsEverySessionOfThePersonAtOnce() {
        UUID owner = TestAuth.rootMember(TestData.uniqueEmail("dono-bloqueio"), "OWNER");
        UUID member = TestAuth.rootMember(TestData.uniqueEmail("bloqueada"), "TEAM");
        String laptop = sessions.issue(member, RootOrganization.ID, Origin.UNKNOWN);
        String phone = sessions.issue(member, RootOrganization.ID, Origin.UNKNOWN);
        AuthenticatedUser actor = new AuthenticatedUser(owner, RootOrganization.ID, "dono@exemplo.com", "OWNER");

        OrgContext.runAs(RootOrganization.ID, () -> accounts.block(actor, member));

        assertThat(sessions.rotate(laptop, Origin.UNKNOWN)).isEmpty();
        assertThat(sessions.rotate(phone, Origin.UNKNOWN)).isEmpty();
        assertThat(ownerJdbc().queryForObject("select status from memberships where user_id = ? and org_id = ?",
                String.class, member, RootOrganization.ID)).isEqualTo("BLOCKED");
    }
}
```

`os/backend/src/test/java/com/xp77/os/accounts/PortalEndpointTest.java`:

```java
package com.xp77.os.accounts;

import com.xp77.os.organizations.api.RootOrganization;
import com.xp77.os.support.PostgresTestBase;
import com.xp77.os.support.TestAuth;
import com.xp77.os.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class PortalEndpointTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void clientSeesNameEmailAndOrganizationForTheWelcomeScreen() throws Exception {
        String email = TestData.uniqueEmail("portal");
        UUID client = TestAuth.rootMember(email, "CLIENT");
        ownerJdbc().update("update users set name = 'Cliente Portal' where id = ?", client);

        mockMvc.perform(get("/portal/me").header("Authorization", "Bearer " + TestAuth.accessToken(mockMvc, email)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Cliente Portal"))
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.organizationName").value("77xp"));
    }

    @Test
    void aBlockedClientIsRefused() throws Exception {
        String email = TestData.uniqueEmail("portal-bloqueado");
        UUID client = TestAuth.rootMember(email, "CLIENT");
        String token = TestAuth.accessToken(mockMvc, email);
        ownerJdbc().update("update memberships set status = 'BLOCKED' where user_id = ? and org_id = ?",
                client, RootOrganization.ID);

        mockMvc.perform(get("/portal/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='AdminUsersEndpointTest,BlockRevokesSessionsTest,PortalEndpointTest' test`
Expected: código de saída 1, `BUILD FAILURE` na compilação: `package com.xp77.os.accounts.service does not exist`.

- [ ] **Passo 2: Escrever as portas novas de `organizations` e `auth`**

`os/backend/src/main/java/com/xp77/os/organizations/api/OrganizationSummary.java`:

```java
package com.xp77.os.organizations.api;

import java.util.UUID;

public record OrganizationSummary(UUID id, String name, String slug) {
}
```

`os/backend/src/main/java/com/xp77/os/organizations/api/OrganizationDirectory.java`:

```java
package com.xp77.os.organizations.api;

import java.util.Optional;
import java.util.UUID;

/** Dados públicos de uma organização (nome para as telas de boas-vindas). */
public interface OrganizationDirectory {

    Optional<OrganizationSummary> find(UUID id);
}
```

`os/backend/src/main/java/com/xp77/os/organizations/service/OrganizationDirectoryService.java`:

```java
package com.xp77.os.organizations.service;

import com.xp77.os.organizations.api.OrganizationDirectory;
import com.xp77.os.organizations.api.OrganizationSummary;
import com.xp77.os.organizations.repository.OrganizationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class OrganizationDirectoryService implements OrganizationDirectory {

    private final OrganizationRepository organizations;

    public OrganizationDirectoryService(OrganizationRepository organizations) {
        this.organizations = organizations;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OrganizationSummary> find(UUID id) {
        return organizations.findById(id)
                .map(organization -> new OrganizationSummary(organization.getId(), organization.getName(),
                        organization.getSlug()));
    }
}
```

`os/backend/src/main/java/com/xp77/os/auth/api/SessionRevocation.java`:

```java
package com.xp77.os.auth.api;

import java.util.UUID;

/**
 * Encerra na hora todas as sessões (refresh tokens) de uma pessoa, em todos os aparelhos.
 * O access token em uso continua valendo até expirar (no máximo 15 minutos).
 */
public interface SessionRevocation {

    void revokeAllSessions(UUID userId);
}
```

`os/backend/src/main/java/com/xp77/os/auth/service/SessionRevocationService.java`:

```java
package com.xp77.os.auth.service;

import com.xp77.os.auth.api.SessionRevocation;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class SessionRevocationService implements SessionRevocation {

    private final RefreshTokenService refreshTokens;

    public SessionRevocationService(RefreshTokenService refreshTokens) {
        this.refreshTokens = refreshTokens;
    }

    @Override
    public void revokeAllSessions(UUID userId) {
        refreshTokens.revokeAll(userId);
    }
}
```

- [ ] **Passo 3: Escrever o módulo `accounts`**

`os/backend/src/main/java/com/xp77/os/accounts/dto/InvitationRequest.java`:

```java
package com.xp77.os.accounts.dto;

import com.xp77.os.users.api.MembershipRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record InvitationRequest(
        @NotBlank(message = "Informe o e-mail")
        @Email(message = "E-mail inválido")
        String email,

        @NotBlank(message = "Informe o nome")
        @Size(max = 120, message = "O nome pode ter até 120 caracteres")
        String name,

        @NotNull(message = "Informe o tipo de conta")
        MembershipRole role) {
}
```

`os/backend/src/main/java/com/xp77/os/accounts/dto/MemberResponse.java`:

```java
package com.xp77.os.accounts.dto;

import com.xp77.os.users.api.MemberSummary;

import java.time.Instant;
import java.util.UUID;

/**
 * Uma conta de acesso na tela "Contas de acesso".
 *
 * @param status PENDING (aguardando primeiro acesso), ACTIVE ou BLOCKED
 */
public record MemberResponse(UUID id, String email, String name, String role, String status, Instant lastLoginAt) {

    public static final String PENDING = "PENDING";
    public static final String ACTIVE = "ACTIVE";
    public static final String BLOCKED = "BLOCKED";

    public static MemberResponse from(MemberSummary member) {
        String status = member.blocked() ? BLOCKED : member.awaitingFirstAccess() ? PENDING : ACTIVE;
        return new MemberResponse(member.userId(), member.email(), member.name(), member.role().name(), status,
                member.lastLoginAt());
    }
}
```

`os/backend/src/main/java/com/xp77/os/accounts/dto/PortalMeResponse.java`:

```java
package com.xp77.os.accounts.dto;

/** O que a tela de boas-vindas da Área do cliente mostra. */
public record PortalMeResponse(String name, String email, String organizationName) {
}
```

`os/backend/src/main/java/com/xp77/os/accounts/service/AccountsService.java`:

```java
package com.xp77.os.accounts.service;

import com.xp77.os.auth.api.FirstAccessTokens;
import com.xp77.os.auth.api.SessionRevocation;
import com.xp77.os.email.api.EmailService;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.exception.NotFoundException;
import com.xp77.os.users.api.MemberSummary;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.MembershipRole;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Contas de acesso (D10): convite, lista, reenvio, bloqueio e desbloqueio, sempre na
 * organização de quem age (claim org do token, já no OrgContext). Cada operação é uma
 * transação só: pessoa, vínculo, link e e-mail nascem juntos ou nada acontece.
 */
@Service
public class AccountsService {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final FirstAccessTokens firstAccess;
    private final SessionRevocation sessions;
    private final EmailService emails;

    public AccountsService(UserDirectory users, MembershipDirectory memberships, FirstAccessTokens firstAccess,
                           SessionRevocation sessions, EmailService emails) {
        this.users = users;
        this.memberships = memberships;
        this.firstAccess = firstAccess;
        this.sessions = sessions;
        this.emails = emails;
    }

    @Transactional
    public MemberSummary invite(AuthenticatedUser actor, String email, String name, MembershipRole role) {
        ensureMayManage(actor, role);
        UUID orgId = actor.orgId();
        Optional<UserAccount> existing = users.findByEmail(email);
        if (existing.isPresent() && memberships.findMember(existing.get().id(), orgId).isPresent()) {
            throw new BusinessException(ErrorCode.CONFLICT, "Este e-mail já tem acesso nesta organização.");
        }
        UserAccount person = existing.orElseGet(() -> users.createWithoutPassword(email, name));
        memberships.grant(person.id(), orgId, role);
        sendInvitation(person, role, person.name() != null ? person.name() : name);
        return memberships.findMember(person.id(), orgId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public List<MemberSummary> list(AuthenticatedUser actor) {
        return memberships.listMembers(actor.orgId());
    }

    /** Reenvia o convite. Se a pessoa ainda não tem senha, o link anterior deixa de valer. */
    @Transactional
    public void resendInvitation(AuthenticatedUser actor, UUID userId) {
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        sendInvitation(new UserAccount(member.userId(), member.email(), member.name(), !member.awaitingFirstAccess()),
                member.role(), member.name());
    }

    /** Bloqueia nesta organização e derruba na hora todas as sessões da pessoa. */
    @Transactional
    public void block(AuthenticatedUser actor, UUID userId) {
        if (actor.userId().equals(userId)) {
            throw forbidden("Você não pode bloquear a própria conta.");
        }
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        memberships.block(userId, actor.orgId());
        sessions.revokeAllSessions(userId);
    }

    @Transactional
    public void unblock(AuthenticatedUser actor, UUID userId) {
        MemberSummary member = memberOf(actor, userId);
        ensureMayManage(actor, member.role());
        memberships.unblock(userId, actor.orgId());
    }

    private MemberSummary memberOf(AuthenticatedUser actor, UUID userId) {
        return memberships.findMember(userId, actor.orgId())
                .orElseThrow(() -> new NotFoundException("Conta não encontrada nesta organização"));
    }

    /** Ninguém mexe no OWNER por aqui; ADMIN só pelo OWNER; o ADMIN cuida de TEAM e CLIENT. */
    private static void ensureMayManage(AuthenticatedUser actor, MembershipRole target) {
        if (target == MembershipRole.OWNER) {
            throw forbidden("A conta do dono não pode ser convidada nem alterada por aqui.");
        }
        if (target == MembershipRole.ADMIN && !MembershipRole.OWNER.name().equals(actor.role())) {
            throw forbidden("Só o dono pode convidar ou alterar um administrador.");
        }
    }

    private void sendInvitation(UserAccount person, MembershipRole role, String greetingName) {
        Map<String, Object> data = new HashMap<>();
        data.put("role", role.name());
        if (greetingName != null && !greetingName.isBlank()) {
            data.put("name", greetingName);
        }
        if (!person.hasPassword()) {
            FirstAccessTokens.Issued link = firstAccess.issueFor(person.id());
            data.put("token", link.token());
            data.put("validityHours", link.validityHours());
        }
        // Cada convite é uma mensagem nova (reenviar manda outro e-mail).
        emails.enqueue(person.email(), EmailService.Templates.CONVITE, data,
                "convite:" + person.id() + ":" + UUID.randomUUID());
    }

    private static BusinessException forbidden(String message) {
        return new BusinessException(ErrorCode.FORBIDDEN, message);
    }
}
```

`os/backend/src/main/java/com/xp77/os/accounts/controller/AdminUsersController.java`:

```java
package com.xp77.os.accounts.controller;

import com.xp77.os.accounts.dto.InvitationRequest;
import com.xp77.os.accounts.dto.MemberResponse;
import com.xp77.os.accounts.service.AccountsService;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Contas de acesso da organização de quem está logado (só OWNER e ADMIN, pela SecurityConfig). */
@RestController
@RequestMapping("/admin/users")
public class AdminUsersController {

    private final AccountsService accounts;

    public AdminUsersController(AccountsService accounts) {
        this.accounts = accounts;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<MemberResponse>>> list(@AuthenticationPrincipal AuthenticatedUser actor) {
        return ResponseEntity.ok(ApiResponse.ok(accounts.list(actor).stream().map(MemberResponse::from).toList()));
    }

    @PostMapping("/invitations")
    public ResponseEntity<ApiResponse<MemberResponse>> invite(@AuthenticationPrincipal AuthenticatedUser actor,
                                                              @Valid @RequestBody InvitationRequest request) {
        MemberResponse invited = MemberResponse.from(
                accounts.invite(actor, request.email(), request.name(), request.role()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(invited));
    }

    @PostMapping("/{id}/invitation")
    public ResponseEntity<Void> resendInvitation(@AuthenticationPrincipal AuthenticatedUser actor,
                                                 @PathVariable UUID id) {
        accounts.resendInvitation(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/block")
    public ResponseEntity<Void> block(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id) {
        accounts.block(actor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/unblock")
    public ResponseEntity<Void> unblock(@AuthenticationPrincipal AuthenticatedUser actor, @PathVariable UUID id) {
        accounts.unblock(actor, id);
        return ResponseEntity.noContent().build();
    }
}
```

`os/backend/src/main/java/com/xp77/os/accounts/controller/PortalController.java`:

```java
package com.xp77.os.accounts.controller;

import com.xp77.os.accounts.dto.PortalMeResponse;
import com.xp77.os.organizations.api.OrganizationDirectory;
import com.xp77.os.organizations.api.OrganizationSummary;
import com.xp77.os.security.AuthenticatedUser;
import com.xp77.os.shared.exception.BusinessException;
import com.xp77.os.shared.exception.ErrorCode;
import com.xp77.os.shared.response.ApiResponse;
import com.xp77.os.users.api.MembershipDirectory;
import com.xp77.os.users.api.UserAccount;
import com.xp77.os.users.api.UserDirectory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Área do cliente (só CLIENT, pela SecurityConfig). O conteúdo chega com cada módulo. */
@RestController
@RequestMapping("/portal")
public class PortalController {

    private final UserDirectory users;
    private final MembershipDirectory memberships;
    private final OrganizationDirectory organizations;

    public PortalController(UserDirectory users, MembershipDirectory memberships,
                            OrganizationDirectory organizations) {
        this.users = users;
        this.memberships = memberships;
        this.organizations = organizations;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PortalMeResponse>> me(@AuthenticationPrincipal AuthenticatedUser client) {
        if (memberships.activeRoleOf(client.userId(), client.orgId()).isEmpty()) {
            throw invalidSession();
        }
        UserAccount account = users.findActiveById(client.userId()).orElseThrow(PortalController::invalidSession);
        String organization = organizations.find(client.orgId()).map(OrganizationSummary::name).orElse("");
        return ResponseEntity.ok(ApiResponse.ok(new PortalMeResponse(account.name(), account.email(), organization)));
    }

    private static BusinessException invalidSession() {
        return new BusinessException(ErrorCode.UNAUTHORIZED, "Sessão inválida ou expirada");
    }
}
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='AdminUsersEndpointTest,BlockRevokesSessionsTest,PortalEndpointTest' test`
Expected: código de saída 0, `Tests run: 16, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Rodar a suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0, `Failures: 0, Errors: 0` em todas as classes, `BUILD SUCCESS` (o `ModuleBoundariesTest` descobre o módulo `accounts` e confirma que ele só usa pacotes `api/`).

- [ ] **Passo 6: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/src/main/java/com/xp77/os/organizations os/backend/src/main/java/com/xp77/os/auth/api/SessionRevocation.java os/backend/src/main/java/com/xp77/os/auth/service/SessionRevocationService.java os/backend/src/main/java/com/xp77/os/accounts os/backend/src/test/java/com/xp77/os/accounts
git commit -m "feat(accounts): add invite-only access accounts and client portal API" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

### Tarefa 15: OpenAPI só em dev/test, `.env.example`, README, CI e verificação final

**Arquivos:**
- Modify: `os/backend/pom.xml` (`springdoc-openapi-starter-webmvc-ui`)
- Create: `os/backend/src/main/java/com/xp77/os/config/OpenApiConfig.java`
- Modify: `os/backend/src/main/resources/application.yml`, `application-dev.yml`, `application-test.yml` (springdoc)
- Create: `os/backend/.env.example`, `os/backend/README.md`, `.github/workflows/os-backend.yml`
- Test: `os/backend/src/test/java/com/xp77/os/config/OpenApiConfigTest.java`, `config/OpenApiDisabledTest.java`, `config/ProductionConfigTest.java`, `config/EnvExampleTest.java`

**Interfaces:**
- Consumes: tudo das Tarefas 1–14 (a verificação final roda a suíte inteira e o ambiente local).
- Produces: `/v3/api-docs` e `/swagger-ui.html` só nos perfis `dev` e `test` (`springdoc.*.enabled=false` no `application.yml`, ligado só em `application-dev.yml` e `application-test.yml`); `OpenApiConfig` com título `77xp OS API`, versão `v1`; `.env.example` com exatamente as 16 variáveis; README do backend em português; workflow `os-backend` no GitHub Actions.

Correções em relação ao Beto_Banco: o Swagger ficava público em produção; o `.env.example` listava chaves que o código não lia (`INFINITEPAY_*`) e omitia as que lia (`MAX_ACTIVE_SESSIONS`, `APP_BASE_URL`…). Aqui dois testes travam isso: nenhum segredo com valor padrão no `prod` e `.env.example` igual ao que a configuração lê.

- [ ] **Passo 1: Escrever os testes de configuração (falham primeiro)**

`os/backend/src/test/java/com/xp77/os/config/OpenApiConfigTest.java`:

```java
package com.xp77.os.config;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class OpenApiConfigTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void apiDocumentationIsPublishedInTheTestProfile() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("77xp OS API"))
                .andExpect(jsonPath("$.info.version").value("v1"));
    }
}
```

`os/backend/src/test/java/com/xp77/os/config/OpenApiDisabledTest.java`:

```java
package com.xp77.os.config;

import com.xp77.os.support.PostgresTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Como em produção: springdoc desligado, a documentação não existe. */
@AutoConfigureMockMvc
@TestPropertySource(properties = {"springdoc.api-docs.enabled=false", "springdoc.swagger-ui.enabled=false"})
class OpenApiDisabledTest extends PostgresTestBase {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void withSpringdocOffTheDocumentationDoesNotExist() throws Exception {
        mockMvc.perform(get("/v3/api-docs")).andExpect(status().isNotFound());
        mockMvc.perform(get("/swagger-ui.html")).andExpect(status().isNotFound());
    }
}
```

`os/backend/src/test/java/com/xp77/os/config/ProductionConfigTest.java`:

```java
package com.xp77.os.config;

import com.xp77.os.Xp77OsApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** O perfil prod exige cada segredo sem valor padrão, falha rápido e não publica a documentação. */
class ProductionConfigTest {

    private static final List<String> REQUIRED_IN_PROD = List.of(
            "DATABASE_URL", "DATABASE_USER", "DATABASE_PASSWORD", "FLYWAY_USER", "FLYWAY_PASSWORD",
            "JWT_SECRET", "CORS_ALLOWED_ORIGINS", "APP_BASE_URL",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM");

    private static String read(String file) throws IOException {
        return new String(new ClassPathResource(file).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static Properties yaml(String file) {
        YamlPropertiesFactoryBean factory = new YamlPropertiesFactoryBean();
        factory.setResources(new ClassPathResource(file));
        return factory.getObject();
    }

    @Test
    void everySecretIsRequiredInProductionWithoutADefault() throws IOException {
        String prod = read("application-prod.yml");

        for (String variable : REQUIRED_IN_PROD) {
            assertThat(prod).as(variable).contains("${" + variable + "}");
            assertThat(prod).as(variable + " sem valor padrão").doesNotContain("${" + variable + ":");
        }
    }

    @Test
    void apiDocumentationIsOffUnlessAProfileTurnsItOn() {
        Properties base = yaml("application.yml");
        Properties prod = yaml("application-prod.yml");

        assertThat(base.getProperty("springdoc.api-docs.enabled")).isEqualTo("false");
        assertThat(base.getProperty("springdoc.swagger-ui.enabled")).isEqualTo("false");
        assertThat(prod.getProperty("springdoc.api-docs.enabled")).isNull();
        assertThat(prod.getProperty("springdoc.swagger-ui.enabled")).isNull();
    }

    /**
     * Sem as variáveis, a subida falha. Qual bean cai primeiro varia (um @Value sem valor
     * dá "Could not resolve placeholder"; a URL do banco sem valor chega ao pool como o
     * texto "${DATABASE_URL}"), mas em todos os casos o erro mostra a variável que faltou.
     */
    @Test
    void productionRefusesToStartWithoutItsVariables() {
        assertThatThrownBy(() -> new SpringApplicationBuilder(Xp77OsApplication.class).profiles("prod").run().close())
                .hasStackTraceContaining("${");
    }
}
```

`os/backend/src/test/java/com/xp77/os/config/EnvExampleTest.java`:

```java
package com.xp77.os.config;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/** .env.example igual ao que a configuração lê; um só nome por variável (lição 7 do Beto_Banco). */
class EnvExampleTest {

    private static final Pattern ENV_PLACEHOLDER = Pattern.compile("\\$\\{([A-Z][A-Z0-9_]*)(?::[^}]*)?}");

    private static final List<String> AGREED = List.of(
            "DATABASE_URL", "DATABASE_USER", "DATABASE_PASSWORD", "FLYWAY_USER", "FLYWAY_PASSWORD",
            "JWT_SECRET", "MAX_ACTIVE_SESSIONS", "CORS_ALLOWED_ORIGINS", "APP_BASE_URL",
            "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM",
            "BOOTSTRAP_OWNER_EMAIL", "SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE");

    private static Set<String> variablesReadByTheConfiguration() throws IOException {
        Set<String> found = new TreeSet<>();
        for (String file : List.of("application.yml", "application-dev.yml", "application-prod.yml")) {
            Matcher matcher = ENV_PLACEHOLDER.matcher(new String(
                    new ClassPathResource(file).getInputStream().readAllBytes(), StandardCharsets.UTF_8));
            while (matcher.find()) {
                found.add(matcher.group(1));
            }
        }
        return found;
    }

    /** O Maven roda os testes com o diretório os/backend como diretório de trabalho. */
    private static Set<String> keysOfEnvExample() throws IOException {
        return Files.readAllLines(Path.of(".env.example")).stream()
                .map(String::trim)
                .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                .map(line -> line.substring(0, line.indexOf('=')))
                .collect(Collectors.toCollection(TreeSet::new));
    }

    @Test
    void envExampleListsExactlyTheVariablesTheConfigurationReads() throws IOException {
        assertThat(keysOfEnvExample()).isEqualTo(variablesReadByTheConfiguration());
    }

    @Test
    void theConfigurationReadsExactlyTheVariablesAgreedInTheSpec() throws IOException {
        assertThat(variablesReadByTheConfiguration()).containsExactlyInAnyOrderElementsOf(AGREED);
    }

    @Test
    void javaCodeNeverReadsEnvironmentVariablesDirectly() throws IOException {
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            List<String> offenders = files.filter(path -> path.toString().endsWith(".java"))
                    .filter(path -> {
                        try {
                            return ENV_PLACEHOLDER.matcher(Files.readString(path)).find();
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .map(Path::toString)
                    .toList();
            assertThat(offenders).as("variáveis de ambiente só nos application*.yml").isEmpty();
        }
    }
}
```

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OpenApiConfigTest,OpenApiDisabledTest,ProductionConfigTest,EnvExampleTest' test`
Expected: código de saída 1, `BUILD FAILURE`: `/v3/api-docs` responde 404 no perfil de teste (springdoc ainda não está no projeto), `springdoc.api-docs.enabled` ausente no `application.yml` e `NoSuchFileException: .env.example`.

- [ ] **Passo 2: Ligar o springdoc só em dev e test**

Inserir no `os/backend/pom.xml` logo antes da linha `        <!-- Testes -->`:

```xml
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
            <version>2.8.6</version>
        </dependency>
```

Acrescentar ao final de `os/backend/src/main/resources/application.yml`:

```yaml

springdoc:
  # Documentação da API desligada por padrão (em produção nunca liga). Só os perfis
  # dev e test a ligam: no Beto_Banco o Swagger ficou público em produção.
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

Acrescentar ao final de `os/backend/src/main/resources/application-dev.yml` e também ao final de `os/backend/src/main/resources/application-test.yml`:

```yaml

springdoc:
  api-docs:
    enabled: true
  swagger-ui:
    enabled: true
```

`os/backend/src/main/java/com/xp77/os/config/OpenApiConfig.java`:

```java
package com.xp77.os.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Título da documentação. Ela só é publicada quando o perfil liga o springdoc (dev e test). */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI xp77OpenApi() {
        return new OpenAPI().info(new Info()
                .title("77xp OS API")
                .version("v1")
                .description("API do 77xp OS: login, contas de acesso, organizações, auditoria e Área do cliente."));
    }
}
```

- [ ] **Passo 3: Escrever o `.env.example`**

`os/backend/.env.example`:

```
# Variáveis de ambiente do backend do 77xp OS.
# Lista EXATAMENTE as variáveis que a configuração lê (o EnvExampleTest confere).
# Valores daqui são só padrões locais seguros; em teste e oficial eles ficam no Render.

# Banco: a aplicação conecta com o papel app_77xp (sem BYPASSRLS, não é dono das tabelas).
DATABASE_URL=jdbc:postgresql://localhost:5432/xp77
DATABASE_USER=app_77xp
DATABASE_PASSWORD=app
# Migrações (Flyway): papel dono das tabelas. A URL é a mesma DATABASE_URL.
FLYWAY_USER=xp77
FLYWAY_PASSWORD=xp77
# Conexões por instância (duas instâncias convivem durante um deploy).
SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE=5

# Login. JWT_SECRET precisa de pelo menos 32 bytes (ex.: openssl rand -base64 48).
JWT_SECRET=
MAX_ACTIVE_SESSIONS=3
CORS_ALLOWED_ORIGINS=http://localhost:5173
# Endereço do site; base dos links dos e-mails (primeiro acesso, redefinição, convite).
APP_BASE_URL=http://localhost:5173

# E-mail: Mailpit no local; Resend (SMTP, porta 587) em teste e oficial.
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
MAIL_FROM=nao-responda@77xp.local

# Dono da organização 77xp: criado na subida, recebe o e-mail de primeiro acesso. Vazio = nada.
BOOTSTRAP_OWNER_EMAIL=
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests ./mvnw -B -Dtest='OpenApiConfigTest,OpenApiDisabledTest,ProductionConfigTest,EnvExampleTest' test`
Expected: código de saída 0, `Tests run: 8, Failures: 0, Errors: 0`, `BUILD SUCCESS`.

- [ ] **Passo 5: Escrever o README do backend**

`os/backend/README.md`:

````markdown
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
````

- [ ] **Passo 6: Escrever o workflow do GitHub Actions**

`.github/workflows/os-backend.yml`:

```yaml
name: os-backend

on:
  push:
    branches: [teste, main]
    paths:
      - 'os/backend/**'
      - '.github/workflows/os-backend.yml'
  pull_request:
    branches: [teste, main]
    paths:
      - 'os/backend/**'
      - '.github/workflows/os-backend.yml'

jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: os/backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven
          cache-dependency-path: os/backend/pom.xml
      # O Testcontainers usa o Docker que já vem no runner ubuntu-latest.
      - name: Testes
        run: ./mvnw -B verify
```

- [ ] **Passo 7: Verificação final — suíte inteira**

Run: `docker compose -f os/docker-compose.yml run --rm backend-tests`
Expected: código de saída 0 e `BUILD SUCCESS`, com `Failures: 0, Errors: 0` em todas as classes — entre elas `ModuleBoundariesTest` (módulos `accounts`, `audit`, `auth`, `config`, `email`, `organizations`, `security`, `shared`, `users`), `MembershipIsolationTest`, `AuthEndpointsTest`, `AdminUsersEndpointTest`, `PortalEndpointTest`, `EmailDispatcherTest`, `SmtpEmailSenderMailpitTest`, `AuditLoggerTest` e `EnvExampleTest`.

- [ ] **Passo 8: Verificação final — ambiente local de ponta a ponta**

```bash
cd /c/Users/wende/dev/77.tech
docker compose -f os/docker-compose.yml down -v
BOOTSTRAP_OWNER_EMAIL=dono@77xp.local docker compose -f os/docker-compose.yml up -d postgres mailpit api
# repita até responder (a primeira subida compila o projeto)
curl -fsS http://localhost:8080/api/v1/actuator/health
# em até ~20 s o e-mail de primeiro acesso chega ao Mailpit
TOKEN=$(curl -s http://localhost:8025/api/v1/message/latest | grep -o 'primeiro-acesso?token=[A-Za-z0-9_-]*' | head -1 | cut -d= -f2)
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/api/v1/auth/first-access \
  -H 'Content-Type: application/json' -d "{\"token\":\"$TOKEN\",\"password\":\"senha-do-dono-123\"}"
ACCESS=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"dono@77xp.local","password":"senha-do-dono-123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/api/v1/admin/users/invitations \
  -H "Authorization: Bearer $ACCESS" -H 'Content-Type: application/json' \
  -d '{"email":"cliente@77xp.local","name":"Cliente Demo","role":"CLIENT"}'
# aguarde ~20 s (ciclo da fila) e confira o convite no Mailpit
curl -s "http://localhost:8025/api/v1/search?query=to:cliente@77xp.local" | grep -c "cliente da 77xp"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/admin/users -H "Authorization: Bearer $ACCESS"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/portal/me -H "Authorization: Bearer $ACCESS"
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/v1/swagger-ui.html
docker compose -f os/docker-compose.yml down
```

Expected, na ordem: o health responde `{"status":"UP",…}`; `TOKEN` não fica vazio; o primeiro acesso imprime `204`; `ACCESS` não fica vazio (login do dono); o convite imprime `201`; a busca no Mailpit imprime `1` (assunto "Seu acesso à Área do cliente da 77xp"); `GET /admin/users` imprime `200`; `GET /portal/me` com o token do dono imprime `403` (a Área do cliente é só de `CLIENT`); a documentação responde `302` ou `200` (ligada no perfil `dev`).

- [ ] **Passo 9: Verificação final — nada fora de `os/`, `docs/` e do workflow novo**

```bash
cd /c/Users/wende/dev/77.tech
git status --short
git diff --name-only teste...HEAD | grep -v -E '^(os/|docs/|\.github/workflows/os-backend\.yml$)'
```

Expected: o `git status` só mostra arquivos desta tarefa (`os/…` e `.github/workflows/os-backend.yml`); o segundo comando não imprime nada (o site Next.js da raiz — `src/`, `package.json`, `tsconfig.json`, `vercel.json`, `docker-compose.yml` da raiz — ficou intacto).

- [ ] **Passo 10: Commit**

```bash
cd /c/Users/wende/dev/77.tech
git add os/backend/pom.xml os/backend/src os/backend/.env.example os/backend/README.md .github/workflows/os-backend.yml
git commit -m "chore(backend): add dev-only OpenAPI, env example, README and CI workflow" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Autorrevisão

### 1. Cobertura da spec (só backend)

| Requisito da spec | Tarefa |
|---|---|
| Pacote `com.xp77.os`, módulos da Fundação, convenção `api/controller/dto/entity/repository/service` | 1–14 |
| ArchUnit: fronteiras com lista de módulos descoberta; nenhum controller recebe `userId`/`orgId`; nenhum controller devolve `@Entity` | 3 |
| Prefixo `/api/v1`; `ApiResponse`, `PageResponse`, `ErrorPayload`, `GlobalExceptionHandler` genérico; `TraceIdFilter`; paginação 20/100 | 1, 2 |
| OpenAPI só em local e teste | 15 |
| Actuator só `health` e `info`; health em `/api/v1/actuator/health` | 1 |
| Convenções de banco (UUID, `TIMESTAMPTZ`, `TEXT` + `CHECK`, `<tabela>_<regra>_check`, `ddl-auto: validate`) | 4, 5, 8, 10, 13 |
| V1 extensões e `search_path` do Supabase | 4 |
| V2 `organizations` + raiz 77xp com id fixo | 4 |
| V3 `users` (e-mail minúsculo único, nome, hash, status) e `memberships` (`OWNER`/`ADMIN`/`TEAM`/`CLIENT`, situação, último acesso, única por par) | 4 |
| V4 papel `app_77xp`, permissões padrão, RLS em `memberships` | 5 |
| V5 `refresh_tokens` (hash, família, `replaced_by`, revogação, aparelho, IP) e `password_reset_tokens` | 8 |
| V6 `audit_logs` com RLS e só inserção | 13 |
| V7 `email_outbox` sem RLS, `dedup_key` única | 10 |
| RLS: `org_id` + `ENABLE`/`FORCE` + política sem exceção para vazio; tabelas globais sem RLS | 5, 13 |
| Aplicação como `app_77xp`, Flyway como dono | 1, 5 |
| `JpaTransactionManager` próprio com `set_config` por transação; organização do token (conferida contra `memberships` no login, na renovação, em `/auth/me` e `/portal/me`) ou do domínio | 5, 7, 9, 14 |
| Teste com duas organizações (lê, altera, apaga, insere; repositório e SQL direto) | 5 |
| `DelegatingPasswordEncoder` com `{argon2}` | 6 |
| JWT HS256 15 min, claims `sub`/`jti`/`org`/`roles`/`email`, segredo ≥ 32 bytes | 7 |
| Refresh 32 bytes, SHA-256, 30 dias, rotação, reuso revoga tudo e responde 401 | 8, 9 |
| Cookie `xp_refresh` `HttpOnly`/`Secure`/`Lax`/`Path=/api/v1/auth` | 8, 9 |
| `MAX_ACTIVE_SESSIONS` (3): aparelho novo derruba a sessão mais antiga | 8 |
| Limite de tentativas (Bucket4j) em login, esqueci-a-senha e redefinição, pelo IP real | 9 (`ClientIpResolver`), 12 |
| Primeiro acesso do dono pelo comando de inicialização (72 h) | 11 |
| Troca de senha revoga todas as sessões | 9 |
| Papéis só no servidor | 4, 6, 7, 9 |
| Tipos de conta (D10); `/admin/**` só `OWNER`/`ADMIN`; `/portal/**` só `CLIENT` | 7, 14 |
| Convite: cria pessoa e vínculo, e-mail com link `FIRST_ACCESS` de 72 h (texto de cliente e de equipe), quem já tem senha só entra; regras de quem convida; 409 | 11, 14 |
| Gestão: `GET /admin/users` (tipo, situação, último acesso), reenviar (invalida o link), bloquear/desbloquear o vínculo (revoga sessões; ninguém bloqueia a si nem o `OWNER`) | 6, 14 |
| Último acesso em `memberships.last_login_at` a cada login | 4, 6, 9 |
| Área do cliente: `GET /portal/me` (nome, e-mail, organização) | 14 |
| Auditoria: `AuditLogger` com constantes; interceptor de `/admin/**` com corpo de até 64 KB e chaves sensíveis mascaradas; login, logout, falha de login, reuso de sessão (e troca/redefinição de senha); só inserção | 13, 14 (auditoria das contas) |
| Fila: `enqueue(para, template, dados, chave)`; 15 s; 20 por ciclo; `SKIP LOCKED` na transação do envio; backoff 1 min/5 min/30 min/2 h/12 h e `FAILED`; health de e-mail desligado; templates de primeiro acesso e de redefinição | 10, 11 |
| Perfis `dev`/`test`/`prod`; `prod` sem valor padrão e falha rápido; variáveis e `.env.example` exatos | 1, 7, 8, 10, 11, 12, 15 |
| Testes obrigatórios das contas (403 cruzados, quem convida quem, 409, reenviar invalida, bloquear revoga e impede o login) | 7, 9, 14 |
| Qualidade: JUnit + Testcontainers (Postgres 17), MockMvc com contexto completo, ArchUnit; TDD | todas |
| GitHub Actions do backend (`./mvnw -B verify`); código de saída sem `| grep` | 15, restrições globais |
| Ambiente local: `postgres:17-alpine`, Mailpit, API (Maven/Temurin 21, perfil `dev`) | 1 |
| Pronto quando 1 (compose + README) — parte backend | 1, 15 |
| Pronto quando 2 (primeiro acesso, troca de senha, renovação, saída, reuso) — parte backend | 8, 9, 11, 15 |
| Pronto quando 3 (isolamento) | 5 |
| Pronto quando 4 (auditoria que não pode ser alterada) | 13 |
| Pronto quando 5 (redefinição pela fila; Mailpit) | 10, 11, 15 |
| Pronto quando 8 (`.env.example` e README em português) — parte backend | 15 |
| Pronto quando 9 (convite → senha → Área do cliente; cliente sem acesso ao painel) — parte backend | 7, 14, 15 |
| Lições do Beto_Banco 1 a 7 | 1 e 15 (1), 10 (2), 3 (3), 5 (4), 9 e 12 (5), 15 (6), 15 (7) |

**Fora deste plano:**
- Plano 2 (frontend): página pública pré-gerada, botão "Entrar", `/entrar`, `/primeiro-acesso`, `/redefinir-senha`, `/painel`, `/painel/conta`, `/painel/contas`, `/minha-conta`, cliente HTTP com trava entre abas, `RequireAuth`/`RequireRole`, Tailwind, Vitest, `typecheck`, Playwright, serviço do frontend no compose, CI do frontend, Pronto quando 6. Os dados de demonstração ("script separado que nunca vai para produção") também ficam para lá, onde o e2e precisa deles.
- Plano 3 (publicação): `Dockerfile` multi-stage, `render.yaml`, Supabase (criação do `app_77xp` com senha, atributos do papel `postgres`), pool contra o limite do pooler, rewrites da Vercel e endereço fixo do branch `teste`, notificação de deploy com falha, Render pago, Resend, confirmação do cabeçalho de IP do Render (valor de `xp77.rate-limit.trusted-proxy-hops`), Pronto quando 7.

### 2. Busca por lacunas

Nenhum passo diz "TBD", "implementar depois", "tratar erros adequadamente" ou "igual à Tarefa N"; todo arquivo criado ou alterado traz o código completo ou a troca exata (trecho atual → trecho novo). Portas literais do Beto_Banco usam cópia com `sed` e listam as únicas diferenças. O único texto para preencher é o `COLE-AQUI-O-TOKEN-DO-LINK` do README, que é instrução para quem usa o ambiente local, não para quem executa o plano.

### 3. Nomes e assinaturas conferidos entre tarefas

- `OrgContext.current/set/clear/callAs/runAs` (5) — usados em 6, 7, 9, 10, 11, 13, 14.
- `UserDirectory.findActiveById/findActiveByEmail/findByEmail/verifyCredentials/createWithoutPassword(email, name)/setPassword` e `UserAccount(id, email, name, hasPassword)` (6) — usados em 8, 9, 11, 14.
- `MembershipDirectory.activeRoleOf/findMember/listMembers/grant/block/unblock/recordLogin` e `MemberSummary` (6) — usados em 9, 11, 14.
- `JwtService.generate(userId, orgId, email, role)/validate/lifetimeSeconds` e `AuthenticatedUser(userId, orgId, email, role)` (7) — usados em 9, 13, 14.
- `RefreshTokenService.issue/rotate/revoke/revokeAll`, `Origin`, `Rotation(userId, orgId, email, newValue)`, `RefreshCookies.NAME` (8) — usados em 9, 11, 13, 14.
- `ClientIpResolver.resolve` (9) — usado em 12 e 13.
- `EmailService.enqueue` e `Templates.PRIMEIRO_ACESSO/REDEFINIR_SENHA` (10), `Templates.CONVITE` (11) — usados em 11 e 14.
- `FirstAccessTokens.issueFor` e `Issued(token, validityHours)` (11) — usados em 11 e 14; `SessionRevocation.revokeAllSessions` (14).
- `AuditLogger.record/recordWithActor/recordResult` e `Actions.*` (13) — usados em 13.
- `TestData` (4, com `hash` na 6) e `TestAuth` (9) — usados daí em diante.
- As trocas "trecho atual → trecho novo" dos arquivos YAML e Java foram conferidas contra o conteúdo que as tarefas anteriores deixam (âncoras únicas no arquivo).
