import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const RAIZ = resolve(import.meta.dirname, '../../..')
const HTML = resolve(RAIZ, 'dist/index.html')

/**
 * Este teste roda o build de verdade. É lento (alguns segundos) de propósito: a
 * alternativa era ler um dist/ que pode não existir e passar sem ter checado nada,
 * que foi exatamente o problema do `npm run lint` antes de ele ter config própria.
 */
describe('página inicial pré-gerada', () => {
  let html = ''
  /** O texto como um leitor o vê: sem as etiquetas que o degradê parte no meio. */
  let texto = ''

  beforeAll(() => {
    execFileSync('npx', ['vite', 'build'], { cwd: RAIZ, stdio: 'pipe' })
    html = readFileSync(HTML, 'utf8')
    texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  }, 120_000)

  it('tem o texto no arquivo, sem depender do JavaScript rodar', () => {
    expect(texto).toContain('O sistema da 77xp Tech')
    expect(texto).toContain('Propostas, clientes e projetos num lugar só')
  })

  it('tem o botão Entrar no HTML', () => {
    expect(html).toMatch(/<a[^>]+href="\/entrar"[^>]*>\s*Entrar\s*<\/a>/)
  })

  it('tem título e descrição para quem compartilha o endereço', () => {
    expect(html).toMatch(/<title>[^<]*77xp[^<]*<\/title>/)
    expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]{40,}"/)
  })

  it('não deixa o #root vazio', () => {
    expect(html).not.toContain('<div id="root"></div>')
    expect(html).toContain('<div id="root">')
  })

  it('não pré-gera as telas de dentro, que dependem de sessão', () => {
    expect(texto).not.toContain('Contas de acesso')
    expect(texto).not.toContain('Senha atual')
  })
})
