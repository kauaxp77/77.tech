import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Rewrite = {
  source: string
  destination: string
  has?: { type: string; value: string }[]
}

type VercelConfig = {
  outputDirectory: string
  rewrites: Rewrite[]
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

const config = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../vercel.json'), 'utf8'),
) as VercelConfig

describe('vercel.json', () => {
  it('serve o index.html no que não encontrar, senão recarregar uma tela interna dá 404', () => {
    const fallback = config.rewrites.at(-1)

    expect(fallback?.source).toBe('/(.*)')
    expect(fallback?.destination).toBe('/index.html')
  })

  it('repassa /api para o Render, para o cookie de sessão voltar', () => {
    // O navegador precisa ver tela e API no MESMO endereço: o cookie de sessão é
    // SameSite. Chamando o Render direto, ele não volta e ninguém continua logado.
    const api = config.rewrites.filter((r) => r.source.startsWith('/api/'))

    expect(api.length).toBeGreaterThanOrEqual(1)
    for (const regra of api) {
      expect(regra.destination).toMatch(/^https:\/\/[^/]+\/api\/v1\//)
    }
  })

  it('o ambiente de teste aponta para a API de teste, não para a oficial', () => {
    const [primeira, segunda] = config.rewrites.filter((r) => r.source.startsWith('/api/'))

    // A regra com condição de endereço precisa vir ANTES da geral: a Vercel usa a
    // primeira que casar, e uma regra sem condição casa com tudo.
    expect(primeira?.has?.[0]?.type).toBe('host')
    expect(primeira?.destination).toContain('teste')
    expect(segunda?.has).toBeUndefined()
    expect(segunda?.destination).not.toContain('teste')
  })

  it('manda os cabeçalhos de segurança em tudo', () => {
    const enviados = config.headers[0]?.headers.map((h) => h.key) ?? []

    expect(config.headers[0]?.source).toBe('/(.*)')
    expect(enviados).toEqual(
      expect.arrayContaining(['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy']),
    )
  })

  it('publica a pasta que o build gera', () => {
    expect(config.outputDirectory).toBe('dist')
  })
})
