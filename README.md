<div align="center">
  <img src="public/logo.png" alt="77xp Tech Solutions" width="150"/>
  <h1>77xp Tech Solutions</h1>
  <p><strong>Premium Digital Platform built on a High-Performance Modular Architecture</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Powered_by-Next.js_15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase" alt="Supabase" />
    <img src="https://img.shields.io/badge/CMS-Sanity-F03E2F?style=for-the-badge&logo=sanity" alt="Sanity" />
    <img src="https://img.shields.io/badge/State-Zustand-orange?style=for-the-badge" alt="Zustand" />
  </p>
</div>

---

## 📌 Visão Geral do Projeto

A plataforma **77xp Tech Solutions** foi arquitetada do zero utilizando um ecossistema "Modular Monolith" focado fortemente na captação de leads B2B (Lead Engine) e alta performance. Nós evoluímos a antiga Landing Page estática para uma aplicação SaaS-grade, integrando banco de dados para segurança de dados, e-mails reativos transacionais e um CMS embutido.

### 🚀 Stack Principal
- **Framework Core**: Next.js 15 (App Router, Server Components, ISR).
- **Styling & UI**: Tailwind CSS (v4) + Framer Motion (Glassmorphism & Animações Premium).
- **Lead Pipeline**: `Zod` (Anti-Injection Validation) + `Supabase` (Storage) + `Resend` (Transacional) + `React Email` (Templating de Alertas).
- **Motor Interativo**: Zustand (Gerenciamento imutável de estado para a Calculadora Interativa Lead Magnet).
- **Headless Datastore**: Sanity CMS integrado com `Graceful Degradation`.
- **E2E Validation**: Playwright.

---

## 🏗️ Design Arquitetural de Alto Nível

Em vez do acoplamento direto padrão de tutoriais, nós protegemos os interesses do sistema utilizando separação de conceitos pesada:

1. **A Camada de Apresentação (UI Frontend)**: Next.js Pages em SSR interagindo com o usuário e exibindo animações no Client-Side.
2. **Controller Logic / Edge**: `src/app/api/leads/route.ts` lida de forma puramente funcional com o Zod, parando ataques e malformações de payloads imediatamente.
3. **Application Services**: `src/services/leadService.ts` coordena o fluxo transacional (ex: Dispara e-mail de notificação. Se falhar no servidor resend, ele **logicamente recua**, mas o lead **é assegurado no banco** para não perder clientes).
4. **Respositories**: `src/repositories/leadRepository.ts`. O resto do app não conhece o Supabase SDK. Se quisermos mudar para Prisma amanhã, apenas 1 arquivo no sistema sofre mutação.
5. **Provider Fallback (Sanity)**: O `cmsService.ts` detém inteligência adaptável. Caso a nuvem falhe ou deêm erro nas chaves de projeto (ou num clone cru do GitHub), o servidor reconhece e **Automaticamente transaciona para mocks státicos sem quebrar a tela**. O famoso *Graceful Degradation*.

---

## 💻 Instruções de Desenvolvimento Local

Nossa arquitetura roda tranquilamente na sua máquina para visualizações de homologação ou estudos.

1. **Clone e Instale**
```bash
git clone https://github.com/seu-user/77.tech.git
cd 77.tech
npm install
```

2. **Secrets / Ambiente Seguro**
Existe um arquivo `.env.example` predefinido mapeando os requisitos de chaves ativas do Sistema.
Copie o conteúdo dele:
```bash
cp .env.example .env.local
```

*(Mesmo sem preencher chaves de Supabase/Sanity ou Resend o sistema vai continuar ligando através da malha de Fallback)*.

3. **Inicie o Ambiente**
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) com o Chrome ou seu navegador favorito.

---

## 🧬 Testes End-to-End Automatizados

Criamos rotinas de qualidade na pipeline do projeto para simular usuários reais navegando em rotas pesadas.
Para rodar a bateria de testes automatizados visual do navegador Chromium via script headless:

```bash
npx playwright test
```

---
*Construído com precisão técnica. À prova de falhas, moldado para escalar.*
