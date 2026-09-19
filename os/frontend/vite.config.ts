import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // O container precisa aceitar conexões de fora dele.
    host: '0.0.0.0',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // O Playwright tem o próprio comando (npm run e2e); o Vitest não olha para e2e/.
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
