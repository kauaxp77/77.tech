import { defineConfig, devices } from '@playwright/test';

// No container (docker compose run --rm e2e) o site já está no ar: PLAYWRIGHT_BASE_URL aponta para ele.
const siteExterno = process.env.PLAYWRIGHT_BASE_URL;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'list' : 'html',
    // O "next dev" compila cada página na primeira visita: a troca de página pode levar mais de 5 s.
    expect: { timeout: 15_000 },

    use: {
        /* Base URL para uso em navegações do tipo `await page.goto('/')`. */
        baseURL: siteExterno ?? 'http://localhost:3000',

        /* Recolhe rastros e erros em falhas. */
        trace: 'on-first-retry',

        /* Como os clientes da 77xp: navegador em português, no horário de Brasília. */
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'celular',
            use: { ...devices['Pixel 7'] },
        },
    ],

    /* Realiza Deploy e Start Server local automaticamente antes dos testes E2E para emular a Prod Layer. */
    webServer: siteExterno
        ? undefined
        : {
              command: 'npm run build && npm run start',
              url: 'http://localhost:3000',
              reuseExistingServer: !process.env.CI,
              timeout: 120 * 1000,
          },
});
