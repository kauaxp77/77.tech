# Quando quebrar

Escrito **antes** de precisar, de propósito. Depois de quebrar ninguém escreve
documentação — sai apagando incêndio.

---

## Primeiro: está mesmo fora do ar?

Abra `https://app.77xp.tech/api/v1/actuator/health`.

| O que responde | O que significa |
|---|---|
| `{"status":"UP"}` | A API está viva. O problema é na tela ou no seu navegador |
| `{"status":"DOWN"}` | A API subiu mas algo dela não está bem — normalmente o banco |
| Página de erro da Vercel | O repasse não achou a API. Veja "A API não responde" |
| Nada carrega | Veja "As telas não carregam" |

---

## Voltar para a versão anterior

**É quase sempre a primeira coisa a fazer.** Volta em um minuto, e você investiga com
calma depois, com o sistema no ar.

**No Render** (a API): painel do serviço → aba **Deploys** → ache o último deploy que
ficou verde → **Rollback to this deploy**.

**Na Vercel** (as telas): projeto → aba **Deployments** → ache o anterior →
**⋯ → Promote to Production**.

> Voltar a versão do Render **não desfaz migração de banco**. Se a versão nova criou uma
> tabela, ela continua lá — o que é inofensivo. Se ela tiver apagado ou mudado uma
> coluna, me chame antes de mexer.

---

## A API não responde

1. **Render → Logs.** Procure a última linha antes de tudo parar.
2. As causas mais comuns:

| O que aparece no log | O que é |
|---|---|
| `Could not resolve placeholder 'ALGUMA_COISA'` | Falta uma variável no painel do Render. Ele diz qual |
| `Connection refused` / `timeout` no banco | Supabase fora do ar, ou o endereço mudou |
| `password authentication failed` | A senha do `app_77xp` está errada |
| `Flyway ... Migration checksum mismatch` | Alguém mudou uma migração já aplicada. **Me chame** |
| `OutOfMemoryError` | O serviço morreu de propósito para ser reiniciado. Se repetir, me chame |

3. **Deploy que falhou:** a versão antiga continua no ar. Isso é bom — mas significa
   que suas alterações novas **não estão valendo**. O Render manda notificação quando
   isso acontece; se não mandou, confira se a notificação está ligada.

---

## As telas não carregam

1. **Vercel → Deployments.** O último está verde?
2. Se a tela abre mas **o login não funciona**, quase sempre é uma destas duas:
   - `CORS_ALLOWED_ORIGINS` no Render não bate exatamente com o endereço que você está
     usando. `https://app.77xp.tech` e `https://www.app.77xp.tech` são endereços
     diferentes para o navegador.
   - Você abriu por um endereço que não está na lista.
3. Se a tela abre e **some ao recarregar uma página de dentro** (dá 404), o
   `vercel.json` não está sendo lido. Confira que o **Root Directory** do projeto é
   `os/frontend`.

---

## O e-mail parou

**Nada se perde.** Os e-mails ficam numa fila no banco (`email_outbox`) e o sistema
tenta de novo sozinho, espaçando as tentativas.

1. Veja no painel da **Resend → Logs** se as mensagens estão saindo.
2. Se pararam: chave vencida, limite do plano atingido, ou domínio com problema de
   verificação.
3. Depois de arrumar, a fila esvazia sozinha. Não precisa reenviar nada à mão.

Enquanto isso, quem precisar entrar e não tiver senha fica esperando — por isso vale
conferir isto no mesmo dia.

---

## O banco não responde

1. **Supabase → painel do projeto.** Ele avisa quando está em manutenção.
2. **Projeto pausado?** O plano grátis do Supabase pausa projetos sem uso por uma
   semana. Basta reativar no painel.
3. **"remaining connection slots are reserved"**: acabaram as conexões. Confira se não
   há mais de dois serviços apontando para o mesmo banco. O tamanho do pool está
   configurado para caber em duas instâncias.

---

## Como saber o que aconteceu numa chamada específica

Toda resposta de erro da API traz um **`traceId`**. Se alguém te mandar um print com
esse número, procure por ele nos **Logs do Render** — ele aparece em todas as linhas
daquela chamada, do começo ao fim.

É o jeito mais rápido de achar uma agulha no palheiro.

---

## Alguém entrou que não devia

1. **Bloqueie a conta** em Contas de acesso. Isso derruba as sessões dela na hora.
2. **Troque a sua senha.** Isso derruba todas as suas sessões, em todos os aparelhos.
3. **Veja a trilha de auditoria** para saber o que foi feito: quem, quando, de qual
   endereço de internet, e — nas alterações de preço — de qual valor para qual.
4. Se a suspeita é de que o `JWT_SECRET` vazou, **troque-o no Render**. Isso invalida
   todas as sessões de todo mundo na hora. As pessoas entram de novo com as senhas
   delas, que continuam valendo.

---

## Quem avisa

- **Render**: manda notificação quando um deploy falha (confira que está ligado).
- **Vercel**: manda por e-mail quando um deploy falha.
- **Supabase**: avisa de manutenção e de projeto pausado.

**Ninguém avisa** quando a API está no ar mas respondendo errado. Monitoramento de
verdade é assunto para quando houver cliente de verdade usando — e merece plano
próprio.

---

## Quando me chamar

Sempre que:

- A mensagem de erro falar em **migração** ou **checksum**.
- O mesmo problema voltar depois de você ter voltado a versão.
- Aparecer perda de dado.
- Você não tiver certeza.

Eu leio os registros do Render e da Vercel **sem precisar de chave nenhuma sua**: o que
aparece lá são mensagens de erro, não segredos. Se algum log mostrar um valor que
parece segredo, me diga — isso é um defeito que precisa ser corrigido.
