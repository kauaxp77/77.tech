import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        // Os testes E2E (tests/e2e) são do Playwright e rodam separado.
        include: ['src/**/*.test.ts'],
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
    },
})
