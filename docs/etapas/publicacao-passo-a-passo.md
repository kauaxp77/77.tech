# Publicar o OS — passo a passo

**Quem faz:** você. Todos os passos daqui são em painéis de serviços, que é onde as
chaves moram. Eu não digito chave, não peço chave no chat e não vejo valor nenhum.

**Quanto custa:** cerca de **US$ 14/mês** (dois serviços no Render, plano Starter, US$ 7
cada). Supabase e Vercel têm plano grátis que serve para começar.

**Quanto demora:** uma hora, sem pressa, na primeira vez.

**O que você vai ter no fim:** o sistema no ar em `teste.app.77xp.tech`, sem nada mudar
no 77xp.tech.

> Faça primeiro só o ambiente de **teste**. O oficial vem depois, quando o de teste
> rodar alguns dias sem susto.

---

## Antes de começar

Tenha aberto:

- github.com (você já tem)
- supabase.com
- render.com
- vercel.com (você já tem, o projeto do site está lá)
- Onde fica o DNS do 77xp.tech (Registro.br, Cloudflare, ou onde você comprou)

Tenha à mão um lugar seguro para guardar senhas — um gerenciador de senhas, não um
arquivo de texto. Você vai gerar três ou quatro segredos.

---

## Passo 1 — Banco no Supabase

1. Entre em supabase.com e crie um projeto novo: **`77xp-os-teste`**.
2. Região: **South America (São Paulo)**, se houver. Fica mais perto.
3. Ele vai pedir uma **senha do banco**. Gere uma longa, guarde no gerenciador. Você não
   vai digitá-la de novo, só colar.
4. Espere terminar de criar (uns dois minutos).

### Passo 1.1 — O papel que a aplicação usa

Isto é importante e não dá para pular.

A aplicação **não** entra no banco como dona das tabelas. Ela entra com um papel
limitado, `app_77xp`, que **não consegue** passar por cima da separação entre
organizações. Sem este passo, a proteção existe no banco mas não vale para a aplicação.

No painel do Supabase, abra **SQL Editor** e cole isto, trocando `SENHA_AQUI` por uma
senha nova que você gere (diferente da do passo 1):

```sql
CREATE ROLE app_77xp WITH LOGIN PASSWORD 'SENHA_AQUI' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_77xp;
```

Clique em Run. Guarde essa senha no gerenciador — ela é o `DATABASE_PASSWORD`.

> As permissões nas tabelas o sistema dá sozinho, na primeira subida (migração V4).

### Passo 1.2 — Anote o endereço do banco

Em **Project Settings → Database → Connection string → JDBC**, copie o endereço. Ele
parece com:

```
jdbc:postgresql://aws-0-sa-east-1.pooler.supabase.com:6543/postgres?user=postgres.xxxx
```

Guarde. É o `DATABASE_URL`.

---

## Passo 2 — E-mail

Sem e-mail não há convite nem recuperação de senha: metade do sistema para.

1. Crie conta em **resend.com** (tem plano grátis com 3.000 e-mails por mês).
2. Em **API Keys**, crie uma chave. Guarde.
3. Em **Domains**, você pode usar o domínio de teste da Resend por enquanto. Para
   e-mail sair como `@77xp.tech`, tem de verificar o domínio depois — e isso mexe no
   DNS, então deixe para o ambiente oficial.

As configurações de SMTP da Resend:

| Variável | Valor |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `resend` |
| `SMTP_PASSWORD` | a chave que você criou |
| `MAIL_FROM` | o remetente que a Resend liberou |

---

## Passo 3 — Backend no Render

1. Entre em render.com, **New → Blueprint**.
2. Aponte para o repositório `kauaxp77/77.tech`.
3. Ele vai ler o `os/render.yaml` e propor **dois** serviços. Crie por enquanto só o
   **`77xp-os-api-teste`**.
4. Plano: **Starter**. Não use o grátis — ele dorme depois de 15 minutos parado e
   bloqueia as portas de e-mail.
5. Ele vai pedir **todas as variáveis** de uma vez, porque estão marcadas para não
   ficarem guardadas no repositório. Preencha:

| Variável | O que pôr |
|---|---|
| `DATABASE_URL` | o endereço do passo 1.2 |
| `DATABASE_USER` | `app_77xp` |
| `DATABASE_PASSWORD` | a senha do passo 1.1 |
| `FLYWAY_USER` | `postgres` |
| `FLYWAY_PASSWORD` | a senha do passo 1 |
| `JWT_SECRET` | gere uma chave longa (veja abaixo) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | do passo 2 |
| `APP_BASE_URL` | `https://teste.app.77xp.tech` |
| `CORS_ALLOWED_ORIGINS` | `https://teste.app.77xp.tech` |
| `BOOTSTRAP_OWNER_EMAIL` | o seu e-mail |
| `MAX_ACTIVE_SESSIONS` | `3` |
| `SPRING_DATASOURCE_HIKARI_MAXIMUM_POOL_SIZE` | `10` |

**Para gerar o `JWT_SECRET`:** no terminal do seu computador, rode
`openssl rand -base64 48` e copie a saída. É uma sequência aleatória de letras e
números. Guarde no gerenciador — se ela vazar, alguém consegue fabricar uma sessão sua.

6. **Ligue a notificação de falha de deploy** (Settings → Notifications). Sem ela, um
   deploy quebrado mantém a versão antiga no ar sem avisar ninguém.

O primeiro deploy demora uns dez minutos (ele compila o Java). Quando terminar, abra
`https://<endereço do render>/api/v1/actuator/health`. Tem de responder
`{"status":"UP"}`.

---

## Passo 4 — Telas na Vercel

1. Em vercel.com, **Add New → Project**, escolha o repositório `77.tech`.
2. **Root Directory: `os/frontend`.** Isto é o mais importante deste passo — sem
   trocar, a Vercel tenta publicar o site atual.
3. Framework Preset: **Other** (o `vercel.json` já diz o que fazer).
4. Nome do projeto: `77xp-os`.
5. **Não mexa no projeto `77-tech`**, que é o site que está no ar.
6. Publique a partir da branch **`teste`**.

---

## Passo 5 — O endereço

No painel do seu DNS, crie um registro:

| Tipo | Nome | Aponta para |
|---|---|---|
| CNAME | `teste.app` | o endereço que a Vercel indicar |

A Vercel mostra exatamente o que pôr em **Settings → Domains**, depois que você
acrescentar `teste.app.77xp.tech` lá.

**Este é o único passo que mexe na zona do 77xp.tech.** Ele não muda o site: só cria um
endereço novo ao lado.

Pode levar de minutos a algumas horas para funcionar.

---

## Passo 6 — Sua senha

Na primeira subida, a API cria a sua conta de dono e manda um e-mail de primeiro
acesso para o endereço que você pôs em `BOOTSTRAP_OWNER_EMAIL`.

Abra o link e escolha a senha. **Eu nunca vejo essa senha**, e ninguém além de você
precisa dela.

Se o e-mail não chegar: confira o Resend (painel → Logs) para ver se ele saiu, e a
caixa de spam.

---

## Passo 7 — Conferir que está tudo de pé

1. Abra `https://teste.app.77xp.tech`. Tem de aparecer a porta de entrada.
2. Clique em Entrar e entre com a sua senha.
3. Vá em **Contas de acesso** e convide alguém (pode ser outro e-mail seu).
4. Veja se o convite chega.
5. Abra a **Tabela de preços** e corrija um valor.

Se os cinco funcionarem, o ambiente de teste está pronto.

---

## Depois

Use o ambiente de teste por alguns dias. Quando confiar, me diga e a gente repete os
passos 1, 3 e 4 para o oficial, com:

- Supabase `77xp-os`
- Render `77xp-os-api`
- Vercel: a mesma conta, publicando da branch `main`
- Endereço `app.77xp.tech`

---

## Se algo der errado

Veja `quando-quebrar.md`, ao lado deste arquivo.

E me chame: eu leio os registros do Render e da Vercel sem precisar de nenhuma chave
sua — o que aparece lá são mensagens de erro, não segredos.
