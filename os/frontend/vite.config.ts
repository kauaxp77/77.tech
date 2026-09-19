import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineConfig, createServer } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Escreve a porta de entrada dentro do dist/index.html no fim do build, para o texto
 * existir no arquivo antes de o JavaScript rodar. O cliente substitui esse HTML ao
 * montar; ele serve para a página aparecer logo e para quem compartilha o endereço.
 */
function prerenderHome(): Plugin {
  return {
    name: 'xp77-prerender-home',
    apply: 'build',
    async closeBundle() {
      const saida = resolve(import.meta.dirname, 'dist/index.html')
      // Um servidor Vite só para carregar o módulo já transformado (TSX, CSS, tudo).
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: 'custom',
        logLevel: 'error',
        // Sem isto, o servidor interno sai varrendo o index.html atrás de dependências
        // e é fechado no meio da varredura — barulho e corrida, sem nenhum ganho aqui.
        optimizeDeps: { noDiscovery: true, include: [] },
        // Cache próprio: sem isto o build estraga o cache do `npm run dev` que estiver
        // aberto na outra janela, e o navegador passa a responder 504.
        cacheDir: 'node_modules/.vite-prerender',
      })
      try {
        const modulo = (await vite.ssrLoadModule('/src/pages/public/prerender.tsx')) as {
          render: () => string
        }
        const html = await readFile(saida, 'utf8')
        const marcado = html.replace('<div id="root"></div>', `<div id="root">${modulo.render()}</div>`)
        if (marcado === html) {
          throw new Error('O <div id="root"></div> mudou no index.html: a pré-geração não achou onde escrever.')
        }
        await writeFile(saida, marcado)
      } finally {
        await vite.close()
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), prerenderHome()],
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
