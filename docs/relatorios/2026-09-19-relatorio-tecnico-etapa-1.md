# Relatório técnico — Etapa 1 (Fundação)

**Data:** 19 de setembro de 2026
**Branch:** `feat/fundacao-backend-ggghen`
**Estado:** entregue e verificada em containers

---

## 1. O que foi entregue

O 77xp OS ganhou a base sobre a qual as etapas 2 a 6 vão ser construídas: contas de
acesso, senhas, sessões e separação entre organizações. Nenhuma funcionalidade de
negócio (propostas, clientes, CRM) faz parte desta etapa — e o painel diz isso na cara,
em vez de mostrar números falsos.

### Números

| | Arquivos | Linhas |
|---|---:|---:|
| Backend (código) | 94 | 4.391 |
| Backend (testes) | 59 | 4.563 |
| Frontend (código) | 36 | 1.946 |
| Frontend (testes) | 11 | 1.179 |
| **Total** | **200** | **12.079** |

Mais testes do que código no backend. Não foi meta, foi consequência: cada regra de
segurança precisa de um teste que prove que ela recusa o caso ruim.

| Suíte | Testes | Onde roda |
|---|---:|---|
| Backend | 236 | Container, PostgreSQL 17 e Mailpit reais (Testcontainers) |
| Frontend | 67 | Node + jsdom, API simulada |
| Ponta a ponta | 6 | Container, pilha inteira de pé |
| **Total** | **309** | |

Todas passando. `BUILD SUCCESS` no backend, `0 failures` no frontend.

---

## 2. Arquitetura

### Backend — Java 21, Spring Boot 3.5.6, PostgreSQL 17

```
os/backend/src/main/java/com/xp77/os/
  organizations/   Organização, resolução por domínio, contexto da requisição
  users/           Pessoa, vínculo (membership), papéis
  auth/            Login, renovação, primeiro acesso, recuperação de senha
  security/        JWT, filtros, limite de tentativas, tratamento de erro
  email/           Fila de e-mail (outbox), modelos, envio
  audit/           Trilha de ações de administrador
  accounts/        Contas de acesso e área do cliente
  config/          Transação ciente de organização, senha, agendamento
  shared/          Envelope de resposta, exceções, trace id
```

Sete migrações Flyway (V1 a V7). O Hibernate roda em `ddl-auto: validate` — ele confere
que o código e o banco combinam, e **nunca** altera o banco sozinho.

### Frontend — React 19, Vite 7, Tailwind 4, TanStack Query 5

```
os/frontend/src/
  api/       Cliente HTTP, tipos, chamadas, hooks
  app/       Sessão, guardas de rota
  layout/    Estrutura do painel e da área do cliente
  pages/     auth/ panel/ portal/ account/ public/
  ui/        Botão, campo, cartão, logo, fundo
  styles/    Cores e utilidades
```

TypeScript no modo estrito, com `noUncheckedIndexedAccess` e
`exactOptionalPropertyTypes` ligados.

---

## 3. Decisões de segurança e por quê

### 3.1 Separação entre organizações no banco, não no código

Cada tabela tem `org_id` e **Row Level Security** do PostgreSQL. O usuário que a
aplicação usa (`app_77xp`) é `NOBYPASSRLS` e não é dono das tabelas — ele **não
consegue** ignorar a regra nem que queira.

Por que assim: um `WHERE org_id = ?` esquecido numa consulta vaza dados de um cliente
para outro. Com RLS, a consulta esquecida simplesmente não retorna nada. O erro passa a
ser "faltou dado" em vez de "vazou dado".

O `app.org_id` é definido por um `OrgAwareJpaTransactionManager` no início de cada
transação. Um teste prova que consulta fora de transação não enxerga nada — e foi
justamente isso que revelou um bug real (item 6.3).

### 3.2 Token de acesso só na memória

O token que autoriza cada chamada vive numa variável JavaScript, nunca no
`localStorage`. Qualquer script injetado na página leria o `localStorage`; a variável
morre com a aba.

O token de renovação vive num cookie `HttpOnly`, inalcançável pelo JavaScript.

### 3.3 Renovação com detecção de reuso

Cada renovação invalida o token anterior. Se o mesmo token de renovação for usado duas
vezes, o servidor entende como token copiado e **derruba todas as sessões da pessoa**.

Isso cria um problema: duas abas abertas renovando ao mesmo tempo derrubariam o usuário
sem motivo. Por isso existe uma trava entre abas no `localStorage`, com prazo de 10
segundos — aba que travou e morreu não trava o sistema para sempre.

### 3.4 Senhas

Argon2id via `DelegatingPasswordEncoder`. O prefixo do hash guarda o algoritmo, então
trocar de algoritmo no futuro não invalida as senhas existentes.

Trocar a senha exige a senha atual, **mesmo com sessão aberta**: sessão aberta prova que
a pessoa entrou algum dia, não que é ela no teclado agora.

### 3.5 Nada some

- Bloquear um vínculo não apaga a pessoa.
- A trilha de auditoria só aceita inserção — não há `UPDATE` nem `DELETE`.
- Não existe endpoint de exclusão definitiva.

### 3.6 Respostas que não vazam informação

`/auth/forgot-password` responde 204 exista o e-mail ou não. O login responde sempre
"E-mail ou senha inválidos". Qualquer diferença contaria a um estranho quais contas
existem.

### 3.7 E-mail em fila transacional

O e-mail não é enviado no meio da requisição. Ele é gravado numa tabela na **mesma
transação** que criou o convite, e um processo separado envia depois, com
`FOR UPDATE SKIP LOCKED`.

Por que: se o envio falhasse no meio, ou o convite existiria sem e-mail, ou o e-mail
sairia para um convite que não foi salvo. Com a fila, ou os dois acontecem ou nenhum.

---

## 4. Como a verificação foi feita

Nenhuma afirmação de "funciona" neste relatório vem de leitura de código.

- **236 testes de backend** rodaram em container, contra PostgreSQL 17 e Mailpit reais.
- **6 testes de ponta a ponta** fazem o caminho de uma pessoa: o dono entra, convida um
  cliente, **o convite chega no servidor de e-mail**, o cliente abre o link, cria a
  senha, entra na área dele e é barrado ao tentar o painel.
- **Três correções importantes foram provadas ao contrário**: revertida a correção, o
  teste falha; recolocada, passa. Isso vale para a corrida de renovação, o limite de
  sessões e a trava entre abas.
- **As telas da documentação** foram fotografadas de uma sessão real contra a API, não
  desenhadas.

---

## 5. Defeitos encontrados durante o trabalho

Todos corrigidos, todos com teste.

| # | Defeito | Como apareceu |
|---|---|---|
| 1 | Listagem da auditoria voltava vazia | Consultas derivadas do Spring Data não são transacionais por padrão, então o `app.org_id` nunca era definido e o RLS escondia tudo |
| 2 | Tela travada em "Verificando…" para sempre | Falha de rede ao abrir o site deixava o estado preso; faltava tratar a rejeição |
| 3 | "Sair" não saía da tela se a API não respondesse | O token local era apagado, mas a interface continuava como se houvesse sessão |
| 4 | Destino do "Sair" mudava a cada vez | Guarda de rota e navegação da tela disputavam; agora é sempre `/entrar` |
| 5 | `.env.example` engolido pelo `.gitignore` da raiz | O CI teria falhado ao procurar o arquivo |
| 6 | Suíte esgotava as conexões do PostgreSQL | Cada classe com configuração própria abria um pool de 10; limitado a 4 |
| 7 | Tipo de conta vinha marcado em "Administrador" | Era o primeiro da lista por acaso. Invertido: o menos poderoso primeiro |

### Verificações que não verificavam nada

Três vezes nesta etapa encontrei um comando que dizia "ok" sem ter checado coisa alguma:

1. **`npm run lint`** subia até a configuração da raiz do site, que ignora `os/**`. Ao
   ligar de verdade, o linter encontrou os defeitos 2 e 3 acima.
2. **`tsc --noEmit` e o lint não cobriam `e2e/`** nem `playwright.config.ts`.
3. **A pasta `scripts/`** não era checada por nada.

Um comando que passa sem olhar é pior do que não existir: ele dá confiança falsa.

---

## 6. Desvios em relação ao plano, e por quê

| Plano dizia | O que foi feito | Motivo |
|---|---|---|
| Bloquear vínculo derruba **todas** as sessões da pessoa | Derruba só as sessões **daquela organização** | Decisão do dono. Bloqueio é do vínculo, não da pessoa no sistema todo |
| Criar `portal/MinhaConta.tsx` | A mesma tela serve painel e área do cliente | Seriam duas cópias idênticas, dois lugares para corrigir o mesmo defeito |
| Portar Hero, Soluções, Diferenciais, Metodologia e CTA para o `/` do OS | Porta de entrada curta | Decisão do dono. Seria uma segunda cópia da página de vendas, incompleta e fadada a divergir |
| Celular testado com perfil iPhone | Perfil Pixel 7 | O perfil do iPhone exige o WebKit, um navegador a mais para manter. O que se mede — largura e menu — não muda de motor |

---

## 7. O que NÃO foi feito

- Publicação. Render, Supabase novo, projeto na Vercel, subdomínio: é o plano 3, ainda
  não escrito.
- Números e gráficos no painel (etapa 6), catálogo e propostas (etapa 2), clientes e
  assinaturas (etapa 3), CRM (etapa 4).
- Cobertura do Safari no e2e. Exigiria instalar o WebKit.
- Revisão por uma segunda pessoa. Tudo aqui foi escrito e revisado pelo mesmo autor.

---

## 8. Riscos e pontos em aberto

### 8.1 Dois sistemas de CRM a caminho — o maior risco desta lista

O site 77xp.tech **já tem** CRM, propostas e reuniões em `/admin`, ligados ao Supabase.
As etapas 2 a 4 vão construir o equivalente em outro banco. Sem decisão, no fim haverá
dois sistemas fazendo a mesma coisa, e um deles com os dados de verdade.

Levantamento completo em `docs/superpowers/levantamentos/2026-09-19-admin-atual.md`.

### 8.2 Duas tabelas de preço que não batem

Descoberto no levantamento: a calculadora que o cliente usa e a proposta que o admin
gera divergem em até **8 vezes** (e-commerce: R$ 60.000 contra R$ 7.500). Não é defeito
de código — é incoerência comercial, e precisa ser resolvida antes da etapa 2.

### 8.3 Tamanho do pool de conexões em produção

A gravação da auditoria abre uma transação nova (`REQUIRES_NEW`), segurando duas
conexões ao mesmo tempo. Em produção o pool está em 5. Sob carga, isso pode travar.
Decisão de dimensionamento para o plano 3.

### 8.4 Origens liberadas no CORS

No modo de desenvolvimento só `http://localhost:5173` é liberado — quem abrir por
`127.0.0.1:5173` toma erro de login sem explicação. Em produção a lista precisa ser
conferida antes de publicar.

### 8.5 O e2e depende de esperar e-mail

A fila de e-mail roda a cada 15 segundos, então o teste espera. Isso deixa a suíte lenta
(cerca de 1 minuto) e sensível a lentidão. Funciona, mas não escala para dezenas de
testes.

---

## 9. Dívidas conscientes

Coisas feitas de um jeito que serve agora e vai precisar mudar:

- **`OrgAwareJpaTransactionManager`** define `app.org_id` por transação. Funciona, mas
  qualquer consulta que escape da transação enxerga nada — o que já causou um bug. Vale
  um teste de arquitetura que barre repositório sem `@Transactional`.
- **A trava de renovação entre abas** usa `localStorage` com prazo fixo de 10 segundos.
  O `Web Locks API` resolveria melhor, mas com menos compatibilidade.
- **A porta de entrada pré-gerada** roda um servidor Vite dentro do build. Funciona, com
  dois detalhes delicados já comentados no código (cache próprio e varredura desligada).
  Se ficar frágil, a alternativa é um passo de build separado.

---

## 10. Próximo passo recomendado

Não é o plano 3.

Antes de publicar, **decidir o que acontece com o admin atual** (8.1) e **qual tabela de
preços é a certa** (8.2). As duas decisões mudam o desenho das etapas 2 a 4, e sai mais
barato decidir agora do que descobrir no meio.

Feito isso, o plano 3 (publicação) vira um trabalho pequeno e sem surpresa.
