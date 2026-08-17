<div align="center">
  <img src="public/logo.png" alt="77xp Tech Solutions" width="150"/>
  <h1>77xp Tech Solutions</h1>
  <p><strong>Plataforma Corporativa Premium & Motor Gerador de Demanda</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Powered_by-Next.js_15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/CMS-Sanity-F03E2F?style=for-the-badge&logo=sanity" alt="Sanity" />
    <img src="https://img.shields.io/badge/State-Zustand-orange?style=for-the-badge" alt="Zustand" />
    <img src="https://img.shields.io/badge/Tested_by-Playwright-2EAD33?style=for-the-badge" alt="Playwright" />
  </p>
</div>

---

## 📌 1. A Evolução do Projeto (Resumo Executivo)

A antiga landing page estática da **77xp Tech Solutions** foi reconstruída do zero escalando para um ecossistema focado na captação de leads institucionais **(Lead Engine)** de alta segurança. Nós empregamos as mais rigorosas restrições e padrões arquiteturais modernos de Engenharia de Software baseados no modelo de **Modular Monolith**, garantindo que as lógicas de Backend não estejam mescladas erroneamente à árvore de renderização do Client-Side.

### 🚀 Stack Tecnológico Fundamental
- **Framework Otimizado**: Next.js 15 (App Router, Full Server Components com caching agressivo ISR de Edge).
- **Styling Core**: Tailwind CSS (Glassmorphism avançado) e Framer Motion (Física UI ultrafluída em sub-rotas).
- **Database Vault**: Supabase com interrogação via API Routes exclusivas protegendo contra injeção SQL.
- **Motor de Estados (Calculadora)**: Zustand.
- **CMS Datastore**: Sanity com implementação nativa de *Graceful Degradation* (Tolerância zero a interrupções).
- **Alertas Corporativos**: Resend (Serverless E-mail) aliado a React Email Templates Dinâmicos.

---

## 🏛️ 2. Topologia do Software e Separação de Conceitos

Criamos diretórios segmentados imitando a Clean Architecture leve que blinda o desenvolvimento.

### A) Módulo B2B & Captura (Pipeline Central)
- Se localiza majoritariamente em `/src/app/api/leads`. É nosso túnel de admissão cimentado por Tipagem em Validação de Zod. Todo payload que chega na web bate nele, que passa para os Domains Seguros (Repositório). Em vez do front disparar emails direto, esse ecossistema funciona nos servidores blindados evitando sequestro de chaves via Console do Google Chrome.

### B) Módulo Estratégico "Lead Magnet" (A Calculadora)
- A Rota `/calculadora` engatilha o Motor de Lógica Complexa desenvolvido com os seguintes pilares: O `CalculatorWizard` orquestra até 8 passos modulares do usuário. Variáveis como Risco e Pressão de Prazo entram no `estimationEngine` (um micro domain abstrato apenas para conta matemática) que retorna Sugestão Arquitetural em BRL. A imutabilidade do store é gerida puramente via Node.js Zustand.

### C) Módulo Operacional Interno (CRM Kanban & Security Edge)
- O ecossistema roda um Painel B2B Admin hermético em `/admin`. Ele é rigorosamente envelopado usando **Next.js Middleware Edge** cruzado com validação Server-Side do `@supabase/ssr`. Apenas credenciais autorizadas e validadas contra o banco com meta-dados `role: admin` conseguem contornar as rotas protegidas (Role-Based Access Control).
- A UI Administrativa opera sob **Row Level Security (RLS)** restrita e utiliza a Engine Mestra do `useOptimistic` State (React 19) e Server Actions. Isso concede fluência irretocável de Zero Latência para mover e classificar os Leads Institucionais nas abas do pipeline sem causar Refetches abusivos na tela.

### D) Módulo Editorial e Motor Headless (Sanity Studio)
- Fiel à arquitetura do Modular Monolith, acoplamos a central Redatorial do CMS Sanity V3 de forma nativa e física na mesma malha do app (rota `/studio`).
- A `CMSService` provê uma abstração absoluta: Ela consome dados de Casos e Artigos via GROQ Queries na nuvem Vercel. 
- **Innovation Alert (Graceful Degradation):** Para evitar desastres perante Datasets Sanity ainda vazios ou ausências de API Keys em servidores locais (clones de novatos), a Service intercepta o perigo silenciosamente na raiz, e recua servindo os arquivos em Mock-ups passivos (`lib/data.ts`). A renderização do layout resiste e não colapsa a face da empresa.

*(Para uma visão mais aprofundada nos Hooks e Funções das APIs, acesse e confira o documento `docs/TECHNICAL_REFERENCE.md`).*

---

## 💻 3. Como Preparar o Setup do Projeto Local 

Se preparar para contribuir no projeto segue o protocolo normal Next.js via Node +20x.

**A) Download e Instalações Globais**
```bash
git clone https://github.com/kauaxp77/77.tech.git
cd 77.tech
npm install
```

**B) Setup de Secrets Invisíveis**
- Use o seu painel do **Supabase** e o **Resend** para puxar as suas credenciais API. Crie um arquivo `.env.local` na raiz e obedeça ao espelho que deixamos para você prever os campos no `.env.example`.
- Preencha primariamente a chave de `SERVICE_ROLE` e garanta que sua URL contenha `https://`.

**C) Go-Live (Levantar o Motor)**
```bash
npm run dev
```

Abra o ecossistema na porta natural [http://localhost:3000](http://localhost:3000). A partir disso, todo evento de Submit do Contato/Calculadora já preencherá o seu Banco de Dados nas nuvens.

---

## 📋 4. Manutenção e Integração Contínua (Deploy)

A Aplicação foi programada especificamente para fluencia inata dentro do **Google Vercel Networks**.

- **Garantia Pré-Deploy**: Recomendamos fortemente invocar a compilação máxima de cache Typescript `npm run build` na sua máquina local antes de empurrar o repositório, para garantir pass green total sem anacronismo estrutural e evitar quebra nos Workers lá na Vercel Caches.

### 🛡️ Testes de QA Regressivos (End-To-End Testing)
Nosso repositório é vigiado puramente com uma suite Playwright embutida de alta confiabilidade. Para testar estressores visuais em navegadores autônomos locais, use o binário de rotina:
```bash
npx playwright test
```

*(O Vercel será capaz de ler o arquivo `playwright.config.ts` no futuro para pipelines Github Actions estritos).*

---

> *"Engenharia que fala o idioma dos negócios. Tolerância contra quedas. Perfomance implacável."* 
> Desenvolvido com excelência técnica por 77xp.
