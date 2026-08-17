<div align="center">
  <img src="https://i.imgur.com/K5b9M47.png" alt="77xp Tech Logo" width="120" />
  <h1>77XP O.S (Operations System) & Master CRM</h1>
  <p><strong>A Plataforma de Operações B2B High-End projetada para Consultorias de Software.</strong></p>
  <p>Construída com Next.js 14, Supabase, Tailwind, Sanity CMS & Agentes de Inteligência Artificial OpenAI.</p>
</div>

---

## 📌 Arquitetura Geral

O projeto **77xp O.S** não é um mero site institucional. Trata-se de um ecossistema complexo dividido em duas fronteiras:
1. **O Palco (Frontend B2B):** Focado em conversão de alto impacto, velocidade extrema e um simulador (Calculadora de Projetos) gamificado para atrair diretores e líderes B2B. A interface usa Framer Motion para estética "Apple".
2. **O Bastidor (Master CRM B2B):** Uma área executiva `/admin` hiper-restrita por Middlewares, que governa o rastreio, funil financeiro a valoração matemática e semântica de prospectos em tempo real via motores de eventos assíncronos.

---

## 🚀 1. Front-end Híbrido & Engenharia de Conversão

### 1.1 Motor de Captação B2B (Lead Magnet Multi-step)
*   **Como funciona:** No lugar de um formulário monótono, há um simulador visual de projeto. O cliente escolhe seu cenário técnico (SaaS, E-commerce, Migrações), preenche as dores de negócio, fornece E-mail Corporativo e Telefone.
*   **Inteligência Embutida:** A submissão mapeia a URI do visitante (UTM Origin) de forma silenciosa para identificar se veio de tráfego orgânico ou tráfego pago da Vercel/Google, acoplado ao estado global utilizando *Zustand*.

### 1.2 Sanity CMS "Deep Schema" (Motor de Portfólio e Blogs)
*   **Como funciona:** Ao invés das postagens viverem estáticas no código, integramos de forma pesada o CMS Headless do Sanity (via Studio route oculta).
*   **Arquitetura Oculta B2B:** Criamos um "Deep Schema" de Cases de Sucesso. O administrador não cadastra apenas o texto; ele injeta dados matemáticos de **ROI** (ex: "+300% leads"), imagens da Galeria técnica, stack utilizada, depoimento em campos isolados. Essa riqueza de dados é servida via GraphQL-like nativo do Sanity diretamente nos cartões visuais do Frontend da Agência.

---

## 🧠 2. Dashboard Executivo & Business Intelligence

### 2.1 Visão Estratégica Command Center
*   **Como funciona:** A Home do CRM consolida uma análise descritiva da operação comercial em blocos dinâmicos baseados no Supabase.
*   **Heurísticas Financeiras Preditivas:** Baseadas na string do "Tipo de Projeto" selecionado na calculadora (ex: "SaaS"), o código Node deduz a projeção do faturamento (Pipeline Estimate, Revenue Closed e Ticket Médio), atribuindo heurísticas invisíveis baseadas em peso sem precisar do preenchimento prévio do cliente.
*   **Funil Percentual Real-time:** Um Gráfico visual puro no backend monitorando as camadas funilares (Volume de Choque -> % Retidos na Qualificação -> % Passados a Negociação -> Global Conversion Rate).

### 2.2 Motor Exportador CSV Enterprise
*   **Como funciona:** A extração estratégica da base em CSV. A diferença é que ela é protegida! 
*   **Endpoint Seguro:** Não é só um botão de frontend; criamos um serviço Serverless Rota GET SSR `/api/admin/export`. Ele checa as credenciais Master baseadas em session JWT e codifica o log em texto CSV formatando a pontuação via BOM-UTF8 (Byte Order Mark), não quebrando acentuações no MS Excel Corporativo brasileiro da diretoria.

---

## 🏭 3. Board Kanban (Gestão de Pipeline) Dinâmica

### 3.1 Drag-and-Drop (API Nativa) Sem Atrito
*   **Como funciona:** Você arrasta leads fisicamente (ex: da coluna Novo para Em Negociação). Usamos hooks avançados para evitar loaders travando sua tela enquanto o NodeJS bate na nuvem Supabase confirmando RLS (Row Level Security). O movimento é suave, veloz e altamente robusto.

### 3.2 O Gavetão Lateral de Contexto (Drawer Component)
*   **Como funciona:** Clique na linha de um prospect e o sistema esmaga a tela à esquerda injetando uma prateleira tática na visualização (slide in direita) detalhando informações pesadas e opções de acionamento do Lead sem você precisar carregar outra página.

---

## ⚙️ 4. O Coração do CRM: Master Intelligence Engine 

Esta é a peça mais formidável do software. O funil não apenas "guarda dados", ele Pensa de 3 formas fundamentais assim que a submissão acontece no front:

### 4.1 O Cérebro Algorítmico Determinal
*   **SLA Tracker Temporal:** Se um lead bater no funil e demorar mais de 2 horas para alguém falar com ele (ficando na aba "NOVO"), o painel dele no Kanban é pintado de vermelho sinalizando violação do Termo de Tempo Operacional.
*   **Scoring Dinâmico:** Calcula sozinho (numa métrica 0 a 100) a prioridade baseada em esforço perceptível de escrita do lead no formulário (mensagens detalhadas grandes pontuam +35pts) e presença de ativos fixos corporativos (E-mails e empresas físicas fornecem +40pts).
*   **Radar Engine de Duplicatas:** Antes da Inserção na Tabela "Leads", o Repositório inspeciona todo o banco tentando interceptar "Emails Prévios" e Números coincidentes para taggear o nome dele em vermelho na UI com `⚠️ Reincidência Oculta`. Evitando perder tempo triplo com mesmo preenchimento.

### 4.2 Cérebro Assíncrono NLP (OpenAI Agent 7G)
*   **Como Ocorre:** Quando o lead entra na infraestrutura, de nada adiantaria a nota matemática avaliar se o cara só digitasse besteira no escopo da tela. Por isso, interceptamos a rota!
*   **A Abordagem LLM (Language Model):** Instanciamos um Cérebro OpenAI `gpt-4o-mini` via Prompt oculto. A IA assume ser a "Diretoria B2B". Recebe as variáveis do Lead cruas e escaneia a intenção e a chance de fechamento nas *entrelinhas* em milissegundos. Devolve um JSON com Nota de Maturidade e um "Diagnóstico Ácido Curto" que é imantado fisicamente dentro do CRM para você basear sua tratativa. (Só opera com token inserido em `.env`).

---

## ⚡ 5. Event Bus Engine e Automações (Infraestrutura Serverless Async)

Construímos um sistema Singleton pub/sub Event Bus que **desacopla** todo trabalho pesado da resposta inicial (Para a Calculadora do Lead render ultra rápida). Quando o banco persistir de fato os dados, a classe do Event Bus emite e reage ouvindo esses sinais na própria Cloud:

### 5.1 O Cérebro de Disparo de Webhooks do Discord (Sprint 7B)
*   A trigger global `lead.created` engatilha uma interface que converte o metadado numa String JSON embutida enviando os valores e a prioridade Mapeada pela OpenAI pra um Webhook do **Discord Interno** do time por conta própria em menos de 100ms. O celular do seu time vibra com o escopo no escuro antes da notificação do email chegar.

### 5.2 Motor Automatizado de Proposta Comercial A4
*   Localizado na frente da *Activity Drawer*, quando um diretor comercial clica em [Gerar Proposta PDF], um endpoint captura todas as intenções e o ID único. Nós refatoramos HTML e Tailwind com classes de tipografia fina puras voltadas ao CSS Print, para desenhar localmente, com os cálculos base de budget automático, uma página em formato de timbrado virtual estático. Pronta para em 1 clique ser "Impressa Local" em formato de Apresentação Proposta ao cliente.

### 5.3 Quick Actions (WhatsApp CRM)
*   As Quick Actions executam rotinas massivas com Regex destruindo os espaços textuais do usuário na hora de fazer "Fetch" e montam dinamicamente por trás a URI linkada da API WhatsApp. Permitindo você ler a IA, apertar [Contactar via WhatsApp] e o aplicativo cruzar para chamar virtualmente o número fornecido ali daquele contato. 

---

<div align="center">
  <p>🛠 O sistema rodará com extrema performance via `npm run dev` dependendo primariamente das Keys de Database: VERCEL, NEXT_PUBLIC_SUPABASE, OPENAI_API_KEY e DISCORD_WEBHOOK_URL expostas em sua camada local.</p>
</div>
