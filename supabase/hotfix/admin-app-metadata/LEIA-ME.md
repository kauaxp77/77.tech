# Correção do administrador — passo a passo

**O problema:** o sistema decidia quem é administrador por um campo do perfil que
o próprio usuário consegue mudar (`user_metadata`). Qualquer pessoa que criasse uma
conta podia se dar o papel de admin e ver todos os leads.

**A correção:** o papel de admin passa para um campo que só o servidor consegue mudar
(`app_metadata`). O código do site já foi ajustado; faltam os passos abaixo no banco.

Todos os comandos são colados no Supabase **do 77.tech**:
**SQL Editor → New query → colar → Run**.

---

## Antes de tudo (1 minuto)

**Desligue o cadastro de novos usuários:**
Authentication → Sign In / Providers → desmarque **"Allow new users to sign up"**.

## Passo 0 — Ver como está hoje (não altera nada)

Rode `0-diagnostico.sql`. Ele mostra três listas:

1. **Todas as contas**, com o papel em cada campo. Se aparecer alguma conta que você
   não conhece, apague em Authentication → Users.
2. **As regras de acesso que ainda usam o campo inseguro** (é o que o passo 2 corrige).
3. **As tabelas e se a proteção está ligada** (`rls_ligado`). Se alguma aparecer como
   `false`, me avise: ela está aberta.

## Passo 1 — Marcar a sua conta como admin

Abra `1-marcar-admin.sql`, troque `seu-email@exemplo.com` pelo e-mail que você usa
no painel e rode. No final deve aparecer o seu e-mail.

## Passo 2 — Trocar as regras de acesso

Rode `2-trocar-regras.sql`. Se você esquecer o passo 1, ele **para sozinho** com
erro, para você não ficar trancado fora. No final não deve aparecer nenhuma linha.

## Passo 3 — Sair e entrar de novo no painel

Em `/admin`, clique em **Finalizar Sessão** e entre de novo. Isso atualiza o seu
login com o novo papel.

---

**Pronto.** A partir daqui, mesmo que alguém consiga criar uma conta, não vê nem
altera nada. Os passos podem ser feitos agora mesmo: funcionam com o site atual e
com a versão nova.

## Como estes scripts foram testados

Num banco Postgres descartável, em container, que imita o Supabase do 77.tech
(mesmas regras de acesso). Para repetir o teste, na raiz do repositório:

```bash
docker run --rm -e POSTGRES_HOST_AUTH_METHOD=trust -v "$PWD/supabase/hotfix/admin-app-metadata:/sql:ro" postgres:17-alpine sh /sql/teste/rodar.sh
```
