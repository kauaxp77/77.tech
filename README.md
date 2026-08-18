<div align="center">
  <h1>🚀 77XP O.S (Operations System) & Master CRM</h1>
  <p><strong>A Plataforma de Operações B2B High-End projetada para Consultorias de Software.</strong></p>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Sanity-F03E2F?style=for-the-badge&logo=sanity&logoColor=white" alt="Sanity CMS" />
    <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white" alt="Stripe" />
    <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  </p>
</div>

---

## 📌 Visão Arquitetural

O **77xp O.S** deixou de ser um site e evoluiu para um ecossistema **Enterprise RevOps** (Revenue Operations).
Dividido em:
1. **O Palco (Frontend B2B):** Focado em conversão e pré-orçamentação automática.
2. **O Bastidor (Master CRM B2B):** Área Executiva Hyper-Restrita (`/admin`) suportando Forecast Financeiro, Agenda de Calls, Contratos Stripe e Bot AI de Vendas Integrado.

---

## 🚀 1. Front-end Híbrido & Engenharia de Conversão

### 1.1 Motor de Captação B2B (Calculadora SaaS)
No lugar de um formulário monótono, há um simulador visual de projeto. O cliente escolhe seu escopo, preenche as dores de negócio, fornece contato e recebe uma prévia simulada de preço. Ao ser submetido, injeta dados ricos no CRM.

### 1.2 Sanity Headless CMS
Cases de Portfólio e Articles de Blog servidos via motor CMS autônomo, permitindo relatórios em tempo real de estatísticas e tecnologias dos cases, perfeitamente integrados com o Design System.

---

## 🧠 2. Dashboard Executivo & Business Intelligence

### 2.1 Visão Estratégica (Cockpit)
O CRM consolida a operação em cards dinâmicos:
*   **Ticket Médio (ACV)**, Realized Revenue vs Gross Pipeline Forecast.
*   **SLA Radar:** Bloqueio Automático e Alertas vermelhos caso Leads fiquem mais de 15 dias sem ação no funil.
*   **Ciclo de Negócio:** Tempo de vida médio (Sales Velocity) desde o preenchimento até a conversão.

### 2.2 Motor Exportador CSV Enterprise
Rota segura Serverless (`/api/admin/export/csv`) emitindo strings BOM-UTF8 prontas para Power BI ou Excel corporativo, cruzando valores nulos (injetando lógica de previsão de MRR automático) pra gerar planilhas sem furos técnicos.

---

## 🏭 3. Board Kanban (Pipeline) Inteligente

### 3.1 Flow Sem Atritos & UX Rica
Uma gaveta expansiva (`LeadDrawer`) contendo o Timeline de atividades.
Você arrasta leads fisicamente entre colunas e o banco assíncrono trabalha em baixo nível com Hooks Otimistas. Movendo para "PERDIDO", engatilha captura forçada de _Loss Reason_ para futuras estatísticas.

### 3.2 Agendamento (Meetings CRM 360) e Stripe
*   O card exibe botão de "Agendar Call", alinhando os status de reunião dentro do fluxo do cliente no pipeline, e emitindo eventos no Painel Dashboard.
*   Link de Pagamento Stripe é gerado injetando Hooks, travando leads para "Fechados" se o webhook retornar compensação bancária.

### 3.3 Trilha de Auditoria (Audit Logs)
Caixa preta de segurança (`Action Trackers`). Ninguém apaga rastros. Tudo que um corretor move é assinado com dia, hora, usuário logado e metadados (`audit_logs`) salvos em tabela RLS restrita, injetados visivelmente pela Timeline da Oportunidade.

---

## 🤖 4. Hyper AI Layer (Inteligência Artificial)

O "Salesbot Autopilot" injetado pelo Motor O-Mini OpenAI opera integrado em 2 frentes (Abas no Drawer):

*   **Aba 1 (Sales Copy):** Lê a nota matemática do Lead (Scoring + Orçamento + Tipo de Sistema) e rascunha um e-mail ultra persuasivo focado na dor daquele prospecto em segundos. Fila de envio sujeita a aprovação Humana (Human-in-the-loop).
*   **Aba 2 (Blueprint Prompt):** IA técnica que extrai o modelo e as intenções de caixa do negócio do cliente, formatando um Mega Prompt arquitetural que pode ser copiado em Cursor/ChatGPT para iniciar o diagrama do backend e plano de 4-Semanas da consultoria 100% desenhado pro cenário B2B.

---

## ⚡ 5. Event Bus Engine & Automações Node

*   **Sistema Pub/Sub:** Core TypeScript que espalha triggers pela infraestrutura. Se um lead é criado ou "Ganho", a nuvem reage em paralelo sem frear a interface.
*   **Discord Alerts:** Cérebro disparando Webhooks instantâneos no servidor do time narrando a chegada de um MQL (Marketing Qualified Lead) antes mesmo da subcessão HTTP terminar a viagem.
*   **Proposta PDF A4 Dinâmica:** Clicar em Gerar Proposta no card renderiza visualmente orçamentos calculados para Impressão Nativa do Browser (A4 estático com Print Mode CSS).
*   **Quick Actions:** Parsing nativo do WhatsApp URL que prepara conversas e templates baseados no telefone e contexto do LEAD, permitindo discagem instantânea num toque.

---

<div align="center">
  <p>🛠 O sistema opera em Full Turbopack Next.js. Deploy Ready with Vercel Environments Variables Control.</p>
</div>
