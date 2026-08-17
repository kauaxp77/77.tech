// Arquivo gerado para documentar regras vitais do 77xp Operations.

# 📊 77xp Master CRM - Guia Definitivo de Heurísticas

Neste documento oficial (solicitado na Sprint 8), estão descritas detalhadamente todas as lógicas Matemáticas e de Precificação embutidas na Plataforma para garantir que você tenha controle absouto sobre seu caixa prospectado e tempo.

---

## 1. 💰 Tabela de Precificação Base (Orçamentos)

A "Heurística Financeira" do seu Dashboard Executivo varre a tabela do Supabase, procura o campo \`project_type\` capturado e assinala um *Valor de Ticket Sugerido* para basear sua Pipeline. Os valores inseridos no sistema, que também alimentam a geração do **PDF de Proposta**, são (Por padrão):

| Tipo de Solução (Identificador) | Ticket Médio Padrão | Prazo Estimado | Justificativa do Algoritmo |
| :--- | :--- | :--- | :--- |
| **SaaS / Sistemas da Informação** | **R$ 15.000,00** | 10 a 16 Semanas | Projetos complexos exigem Discovery, Arquitetura de Banco de Dados, Backend robusto e integrações (Next.js + Node + DB). Alto Risco/Alta Recompensa. |
| **E-commerce Institucional** | **R$ 7.500,00** | 8 a 10 Semanas | Focado em integrações de Pagamento (Stripe/MercadoPago), catálogos com alto volume e interfaces conversivas robustas. |
| **Plataformas Escalonáveis** | **R$ 4.000,00** | 4 a 6 Semanas | Valor intermediário de "Software Leve". Dedicado a MVPs rápidos de validação estrutural. |
| **Landing Pages / Hotsites** | **R$ 2.500,00** | 2 a 3 Semanas | Sites de página única "High-End" (Alto Padrão). Não cobramos abaixo disso devido à inserção de Copywriting agressivo e Framer Motion. |
| *Outros (Default fallback)* | **R$ 1.500,00** | - | Um valor fixado baixo para não zerar a pipeline quando o cliente não sabe o que quer. |

*(Nota: Na hora de gerar o PDF em \`/admin/proposal/ID\`, esses são os valores que a máquina crava. Você pode alterá-los a qualquer momento no arquivo `src/app/admin/(dashboard)/proposal/[id]/page.tsx` ou no dashboard `page.tsx`).*

---

## 2. ⏳ Sistema de Prioridade Computacional (O Scoring)

As "barras de progresso" laranjas e a nota /100 que definem qual lead você atende primeiro seguem um sistema cirúrgico baseado no comportamento do usuário:

1. **Nota Inicial Estática:** Começa em **0**.
2. **Telefone (WhatsApp):** O motor checa. Se ele inseriu celular, a nota sobe **+25 pontos**. (Significa canal de contato direto vivo).
3. **Pessoa Jurídica (Empresa):** Se ele digitou algo em "Empresa", a nota sobe **+15 pontos**. 
4. **Tamanho do Escopo:** O algoritmo conta as letras na mensagem. 
   - Mensagens **maiores que 100 letras**: +30 pontos (Demonstra alto compromisso mental em explicar o problema).
   - Mensagens **maiores que 40 letras**: +15 pontos (Compromisso mediano).
   - Menores que isso: 0 pontos. (Geralmente curiosos).
5. **Inteligência Artificial (OpenAI NLP):** Caso configurada, a OpenAI lê a mensagem com processamento de intenção e injeta uma nota complementar de 0 a 100 via API que representa até 30% da nota global.

**Escalas de Prioridade no Kanban:**
- Score >= 70 (`PRIORIDADE ALTA` -> Atenda Imediatamente, muito dinheiro na mesa).
- Score >= 40 (`PRIORIDADE MÉDIA` -> Tem intenção mas precisa curadoria).
- Score < 40 (`PRIORIDADE BAIXA` -> Curioso / Leads não rastreáveis).

---

## 3. 🚨 O SLA Tracker Temporal

SLA = *Service Level Agreement*. No seu mercado, tempo de resposta é fechamento.
Toda vez que o Gavetão Lateral abre (Drawer) o arquivo calcula o tempo perfeitamente entre o exato dia/hora que o registro entrou no banco de dados e o dia/hora de AGORA.

Se o Lead pertencer a coluna **NOVO** (Sem contato) e o cálculo passar de **2 Horas Uteis**, ele levanta uma flag de \`SLA VIOLADO\` vermelho na Interface, informando seu time que a empresa está perdendo tração de vendas e o lead esfriou. Mover ele para a coluna Negociação "zera" essa punição.
