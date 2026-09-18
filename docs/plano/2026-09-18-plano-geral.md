# 77xp OS — Plano geral

> Documento para o dono da 77xp ler e aprovar. Escrito em 18/09/2026, a partir das
> conversas de planejamento. Linguagem simples de propósito.

## O que é o 77xp OS

É o sistema que vai rodar a sua empresa de software do começo ao fim:

**o cliente chega (lead) → recebe uma proposta com preço certo → vira projeto → o sistema
dele vai pro ar → ele paga todo mês → você acompanha tudo num painel só.**

Ele substitui o site e o painel atuais do 77.tech (que continuam no ar até a troca) e
segue a mesma arquitetura do seu projeto Beto_Banco. Mais pra frente, o mesmo sistema
pode ser oferecido para outras empresas (white-label).

## Decisões já tomadas

| Assunto | Decisão |
|---|---|
| Onde fica o código | No repositório **77.tech**, na pasta `os/` (`os/backend/` e `os/frontend/`); o site atual continua na raiz até a troca |
| Tecnologia | Igual ao Beto_Banco: Java 21 + Spring Boot 3.5, PostgreSQL 17, React 19 + Vite + React Router 7 |
| Diferenças em relação ao Beto_Banco | Páginas públicas geradas prontas (para o Google ler) e visual em Tailwind (aproveita as telas do 77.tech) |
| Como começar | Projeto novo, trazendo as peças prontas e testadas do Beto_Banco e corrigindo os problemas achados lá |
| Banco de dados | Projeto Supabase novo, só do 77xp OS (e um segundo, grátis, para o ambiente de teste) |
| White-label | Preparado desde o primeiro dia (todo dado pertence a uma organização); no começo só existe a 77xp |
| Ambiente de teste | Sim: cada mudança passa por um link de teste antes de ir para o oficial |
| Sanity | Não existe no sistema novo: todo conteúdo é editado pelo próprio painel |

## As etapas, na ordem

Cada etapa tem o próprio plano, é testada no ambiente de teste e vai pro ar sozinha:
você começa a usar sem esperar o sistema inteiro.

### 1. Fundação — 1 a 2 semanas
O esqueleto em que todo o resto se apoia: login seguro, organizações, banco de dados
organizado, ambiente em containers no seu computador, testes automáticos e publicação.
**Você recebe:** o painel novo (com login e menu de seções, ainda vazio) e a página
inicial pública nova, publicados no teste e no oficial. Também o botão **"Entrar"** no
site e as **contas por convite**: você convida equipe e clientes pelo painel (página
"Contas de acesso"), cada um cria a própria senha, e o cliente entra na **Área do
cliente**, que ganha informações a cada etapa seguinte.

### 2. Catálogo e tabela de preços — cerca de 1 semana
Seus pacotes de software (ex.: "Sistema de agendamento", "E-commerce", "SaaS") com
escopo, prazo e preço-base, mais os ajustes (nível de design, complexidade, urgência) —
**tudo editável pelo painel**. A calculadora do site, a proposta em PDF e o link de
pagamento passam a usar a mesma tabela. **Acaba o erro de hoje**, em que a calculadora
mostra R$ 36 mil e a proposta cobra R$ 4.000. Uma proposta enviada guarda o preço do
dia, mesmo que a tabela mude depois.

### 3. Clientes, sistemas e assinaturas — cerca de 2 semanas
- **Ficha do cliente:** contatos, telefones, dados da empresa e **contratos anexados**.
- **Planos:** mensal, vitalício (pagamento único) ou projeto avulso; quem está em dia,
  atrasado ou cancelado; histórico de pagamentos.
- **Cobrança recorrente automática** (PIX, boleto e cartão). O provedor de pagamento
  será escolhido nesta etapa (Stripe, InfinitePay ou outro que tenha assinatura).
- **Sistemas de cada cliente:** os projetos dele na Vercel, no Render e no Supabase, com
  situação ao vivo e último deploy.
- **Manutenção e suporte:** quem precisa de manutenção, chamados abertos e histórico.
- **Acessos guardados com criptografia** e registro de quem viu ou mudou o quê.
- **Opcional:** pagamento atrasado há X dias → aviso ao cliente → site pausado
  automaticamente, e reativado quando o pagamento cair.
- **Área do cliente:** cada conta de cliente fica ligada à ficha da empresa dele, e o banco
  passa a separar os dados também por cliente. O cliente vê a assinatura e os pagamentos
  (com link para pagar), o contrato, a situação dos sistemas dele e os chamados — e abre
  chamado por ali.

### 4. CRM completo — 1 a 2 semanas
Tudo que o CRM atual tem (quadro de leads, gaveta do lead, reuniões, propostas,
histórico), com as melhorias: tarefas e lembretes de follow-up, empresas e contatos
ligados ao lead, busca e filtros, e a inteligência artificial funcionando de verdade
(hoje o "Salesbot" é um texto pronto). Aqui entram também o site público completo
(calculadora, contato e blog) e a **troca do site** (veja abaixo). Na Área do cliente, o
cliente passa a ver a proposta dele e as reuniões marcadas.

### 5. Fábrica de projetos — cerca de 1 semana
Negócio fechado vira projeto e passa pelas 7 etapas da sua metodologia (Discovery,
Arquitetura, UX/UI, Desenvolvimento, QA, Deploy, Evolução), com checklists, entregáveis,
prazos e horas. O "prompt de arquitetura" do Salesbot vira o ponto de partida do projeto.
O cliente acompanha o andamento do projeto dele (as 7 etapas e os entregáveis) na Área
do cliente.

### 6. Dashboard analítico — cerca de 1 semana
Vendas ao longo do tempo, funil com período escolhido, MRR (receita mensal), churn
(cancelamentos), inadimplência, saúde dos projetos e metas.

### 7. White-label — 1 a 2 semanas
Oferecer o 77xp OS para outras empresas: cada uma com a própria marca (logo e cores), o
próprio domínio e os próprios dados, separados dos seus.

### Em paralelo: portfólio pessoal — alguns dias
Página pública com as suas experiências, projetos e habilidades, editada pelo painel e
pronta para o Google. Pode entrar a qualquer momento, sem atrapalhar as outras etapas.

## A troca do site

- O site e o painel atuais (77.tech) **continuam no ar** durante todas as etapas.
- A troca acontece quando o sistema novo tiver o **site público e o CRM** prontos
  (final da etapa 4).
- No dia: os leads, as reuniões e o histórico são copiados para o banco novo, o seu
  domínio passa a apontar para o sistema novo e o sistema antigo fica guardado como
  reserva. **Nada é apagado.**

## Prazo e custos

**Prazo total estimado: 2 a 3 meses**, entregando por etapas. O que mais acelera é
decidir e testar cada etapa rápido.

| Serviço | Para quê | Custo por mês |
|---|---|---|
| Render — plano Starter | Servidor oficial | cerca de US$ 7 |
| Render — plano Starter | Servidor de teste | cerca de US$ 7 |
| Supabase | Banco oficial e banco de teste | grátis no começo (2 projetos grátis) |
| Vercel | Telas (oficial e teste) | o plano atual. Atenção: o plano grátis (Hobby) é só para uso pessoal; para empresa a Vercel pede o Pro (US$ 20) |
| E-mail (Resend) | E-mails do sistema | grátis até 3 mil por mês |

Custos que aparecem nas próximas etapas: taxas do provedor de pagamento (etapa 3) e a
inteligência artificial (etapa 4, cobrada por uso).

## Como trabalhamos

- Toda mudança nasce num branch próprio, passa pelo **branch `teste`** (com link de
  teste) e só vai para o **`main`** (oficial) com o seu ok.
- Testes automáticos rodam a cada envio; só vai pro ar o que passou.
- Tudo roda em containers no seu computador (Docker), sem tocar na produção.
- Uma sessão de cada vez mexendo no mesmo repositório, para não haver mudanças repetidas.

## Riscos conhecidos

| Risco | Como tratamos |
|---|---|
| O sistema antigo e o novo ficarem diferentes durante a transição | A troca só acontece com site público + CRM prontos e testados |
| Problemas herdados do Beto_Banco | Cada peça trazida é conferida e testada; os problemas já conhecidos têm correção planejada (veja o documento da Fundação) |
| Perder leads na troca | Cópia com conferência de contagem antes de mudar o domínio; sistema antigo guardado como reserva |
| Custos crescerem sem aviso | Tabela de custos revista a cada etapa |
