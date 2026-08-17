# 📘 Referência Técnica & Arquitetural Detalhada (77xp Tech Solutions)

Este documento foi moldado para fornecer uma visão absoluta (Função por Função) da topologia do sistema. Ele serve como o guia primário para novos Desenvolvedores e Engenheiros de Software que precisarem estender as funcionalidades da plataforma.

---

## 🏛️ 1. O Core (Domain e Data Flow)

### `src/schemas/lead.ts`
- **Função**: Define a forma imutável (Shape) de um Lead que será recebido no sistema.
- **Mecânica Principal**: Usa a biblioteca `Zod` (Validação via Schema). Se o lead não contiver um e-mail válido ou o tipo de projeto, a rotina quebra localmente sem jamais poluir o Banco de Dados. Funciona como um "escudo".

### `src/repositories/leadRepository.ts`
- **Função**: Conector agnóstico para banco de dados. Responsável pela "Inserção da Verdade".
- **Comportamento**: Ele checa se a variável de servidor `SUPABASE_SERVICE_ROLE_KEY` existe e usa URLs HTTP puras. Caso detecte uma falha de setup (Graceful Degradation), ele "mocka" localmente a criação do lead informando no log do servidor que capturou as informações, evitando engasgos da Vercel. Caso sucesso, ele aponta para a tabela `leads`.

### `src/services/cmsService.ts`
- **Função**: Atua como provedor unificado de Artigos e Cases de Sucesso.
- **Groq Fetching**: Em caso das senhas do Sanity estarem expostas ele engata o Provider do `next-sanity` fazendo cache ISR na Edge de 1 hora. Se houver falha, ele busca nativamente das variáveis Hardcoded localizadas em `src/lib/data.ts`.

### `src/lib/estimationEngine.ts`
- **Função**: É o cérebro calculista (Matemática Pura).
- **Mecânica Principal (`calculateEstimation`)**: Analisa as escolhas do usuário na calculadora, cruzando níveis de experiência, urgência de prazo (multiplicador `* 1.5`) e entrega como resultado um limite mínimo e máximo do valor em Reais e qual a arquitetura recomendada (ex: Padrão Hexagonal vs Serverless Functions).
- **Mecânica Secundária (`formatCalculatorToLeadPayload`)**: Pega todas essas respostas difusas que a UX produziu na Calculadora e empacota em formato de String injetável compatível com a Tabela estrita do BD.

---

## 🚦 2. O API Gateway Posterior (Rotas de Edge Vercel)

### `src/app/api/leads/route.ts`
- **Função Oculta**: Rota restrita (Server-Side) que aceita o POST HTTP originado dos formulários visuais. 
- **Defesa**: Aplica o `LeadSchema.safeParse()`. Ele rejeita silenciosamente com um `{status: 400}` malformações.
- **Workflow Atômico**: Passada a Defesa Zod -> O Repositório é Acionado -> O Resumo é enviado em formato de Objeto de E-mail para a classe `Resend` disparar pelo Template Visual. Se Resend falhar na rede, captura o erro e avisa, mas não anula as alterações no banco de dados.

---

## 🧩 3. O Client-Side e Interface Gráfica UI

### `src/app/page.tsx` (Página Principal)
- **Função**: Apresenta e coordena o Single Page Flow com Hero Premium, Metodologias e Prova Social (Cases). É um **Server Component** asíncrono que busca as requisições puramente do Node.js (via `CMSService.getPosts()`) não afetando o Client Side Loading Time e injeta os propós para os Componentes Animáveis de Framer Motion abaixos da árvore (Dependecy Injection).

### `src/components/calculator/CalculatorWizard.tsx`
- **Função**: A Máquina de Orçamentos (Lead Magnet).
- **Motor `framer-motion`**: Usa a tag `<AnimatePresence mode="wait">`. Para cada variável do contador `step`, um sub-componente visual e condicional é montado entrando no fluxo enquanto o velho se dissolve em opacidade, num balé imutável.
- **Integração Backend**: Quando atinge o `step === 7` (Captura de E-mail), dispara o estado de IsLoading UI spinner para o `fetch()` conversar diretamente com nosso `/api/leads`. Se a Cloud responder bem, ele avança orgulhoso pro Step 8 (A vitrine dos dados).

### `src/store/useCalculatorStore.ts`
- **Função**: Provém Global State puramente assíncrono pro React. Dispensa o uso tóxico do ContextAPI do React Native Core, impedindo Render Cycles excessivos nos passos.

### `src/emails/LeadNotification.tsx`
- **Função**: Interface gráfica enviada ao dono da empresa contendo as variáveis do prospect. Compilado de JSX nativo para HTML Vanilla compatível com Outlooks e Apple Mail antigos usando `@react-email`.

---

## 🛂 4. A Malha de Qualidade (Q&A) E E2E Testing

### `tests/e2e/navigation.spec.ts`
- **Função**: Script de Homologação Playwright.
- **Test Core**: Simula os comandos visuais do Mouse via Sandbox isolada que liga o localhost de forma fantasma e avalia se textos essenciais e SEO headers ("77xp Tech Solutions") estão em órbita após a transpiração do Código, abortando entregas comprometedoras.
