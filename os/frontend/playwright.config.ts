import { defineConfig, devices } from '@playwright/test'

/**
 * O e2e roda contra a pilha inteira de pé (docker compose up -d em os/), não contra
 * mocks: é a única prova de que backend, banco, e-mail e telas funcionam juntos.
 *
 *   BOOTSTRAP_OWNER_EMAIL=dono@77xp.local docker compose -f os/docker-compose.yml up -d
 *   cd os/frontend && npm run e2e
 */
/** Para ambientes que já têm o Chromium instalado noutro lugar (CI, containers). */
const chromium = process.env['E2E_CHROMIUM_PATH']

/**
 * Containers que rodam como root: o Chromium se recusa a abrir com a caixa de areia
 * ligada. Desligar a caixa de areia enfraquece o navegador, então isto só serve para
 * container descartável de teste — nunca num navegador que abre a internet.
 */
const semCaixaDeAreia = process.env['E2E_NO_SANDBOX'] === '1'

const launchOptions = {
  ...(chromium === undefined ? {} : { executablePath: chromium }),
  ...(semCaixaDeAreia ? { args: ['--no-sandbox'] } : {}),
}

export default defineConfig({
  testDir: './e2e',
  // Um de cada vez: os testes dividem um banco e uma caixa de e-mail só.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(Object.keys(launchOptions).length === 0 ? {} : { launchOptions }),
  },
  // Cada arquivo no seu tamanho de tela: rodar os dois nos dois só dobraria o tempo.
  projects: [
    {
      name: 'computador',
      testMatch: /desktop\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'celular',
      testMatch: /celular\.spec\.ts/,
      // Pixel 7 e não iPhone: o perfil do iPhone pede o WebKit (o motor do Safari),
      // que é um navegador a mais para instalar e manter. O que estes testes medem
      // — largura da tela e o menu ☰ — não muda de motor. Para cobrir o Safari de
      // verdade um dia: `npx playwright install webkit` e um projeto novo aqui.
      use: { ...devices['Pixel 7'] },
    },
  ],
})
