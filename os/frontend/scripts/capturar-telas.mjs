/**
 * Tira foto de todas as telas do OS e grava em docs/telas/.
 *
 * Foto em documento envelhece calada: a tela muda e a imagem continua lá, mentindo.
 * Por isso isto é um script e não um punhado de imagens soltas — quando a tela mudar,
 * um comando refaz todas.
 *
 *   docker compose -f os/docker-compose.yml up -d     (com BOOTSTRAP_OWNER_EMAIL)
 *   cd os/frontend && node scripts/capturar-telas.mjs
 *
 * A conta usada é a do dono criada para testes. Se ela ainda não tiver senha, crie
 * pelo link que chega no Mailpit (http://localhost:8025).
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, devices } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
const EMAIL = process.env.E2E_OWNER_EMAIL ?? 'dono@77xp.local'
const SENHA = process.env.E2E_OWNER_PASSWORD ?? 'dono-de-teste-77xp'
const DESTINO = resolve(import.meta.dirname, '../../../docs/telas')

const executablePath = process.env.E2E_CHROMIUM_PATH
const args = process.env.E2E_NO_SANDBOX === '1' ? ['--no-sandbox'] : []

async function entrar(page) {
  await page.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' })
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha').fill(SENHA)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/painel', { timeout: 30_000 })
}

/** Espera a animação de entrada terminar: foto tremida não ajuda ninguém. */
async function assentar(page) {
  await page.waitForTimeout(500)
}

async function main() {
  await mkdir(DESTINO, { recursive: true })
  const browser = await chromium.launch({
    ...(executablePath === undefined ? {} : { executablePath }),
    ...(args.length === 0 ? {} : { args }),
  })

  try {
    const computador = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const p = await computador.newPage()

    // Telas públicas, sem sessão.
    await p.goto(BASE, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('text=O sistema da')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/01-porta-de-entrada.png` })

    await p.goto(`${BASE}/entrar`, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('input[type=email]')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/02-entrar.png` })

    await p.goto(`${BASE}/esqueci-a-senha`, { waitUntil: 'domcontentloaded' })
    await p.waitForSelector('input[type=email]')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/03-esqueci-a-senha.png` })

    // Telas de dentro.
    await entrar(p)
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/04-painel-visao-geral.png` })

    await p.getByRole('link', { name: 'Contas de acesso' }).click()
    await p.waitForSelector('text=Convidar')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/05-contas-de-acesso.png` })

    await p.getByRole('link', { name: 'Tabela de preços' }).click()
    await p.waitForSelector('text=Projeto base')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/06-tabela-de-precos.png`, fullPage: true })

    await p.getByRole('link', { name: 'Montar orçamento' }).click()
    await p.waitForSelector('text=Adicionais')
    await p.getByLabel('Projeto base').selectOption({ index: 2 })
    await p.getByRole('checkbox', { name: /Login de usuários/ }).check()
    await p.getByLabel('Tipo de cobrança').selectOption({ label: 'Agência' })
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/07-montar-orcamento.png`, fullPage: true })

    await p.getByRole('link', { name: 'Minha conta' }).click()
    await p.waitForSelector('h2:has-text("Trocar senha")')
    await assentar(p)
    await p.screenshot({ path: `${DESTINO}/08-minha-conta.png` })

    // Celular.
    const celular = await browser.newContext({ ...devices['Pixel 7'] })
    const c = await celular.newPage()

    await c.goto(BASE, { waitUntil: 'domcontentloaded' })
    await c.waitForSelector('text=O sistema da')
    await assentar(c)
    await c.screenshot({ path: `${DESTINO}/09-celular-porta-de-entrada.png` })

    await entrar(c)
    await assentar(c)
    await c.screenshot({ path: `${DESTINO}/10-celular-painel.png` })

    await c.getByRole('button', { name: 'Abrir menu' }).click()
    await assentar(c)
    await c.screenshot({ path: `${DESTINO}/11-celular-menu.png` })

    await c.getByRole('button', { name: 'Fechar menu' }).click()
    await c.goto(`${BASE}/painel/contas`, { waitUntil: 'domcontentloaded' })
    await c.waitForSelector('text=Convidar')
    await assentar(c)
    await c.screenshot({ path: `${DESTINO}/12-celular-contas.png`, fullPage: true })

    console.log(`Telas gravadas em ${DESTINO}`)
  } finally {
    await browser.close()
  }
}

await main()
