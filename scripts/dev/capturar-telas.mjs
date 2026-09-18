// Tira fotos das páginas no tamanho de celular e mostra se algo passa da largura da tela.
// Precisa do site e do Supabase local ligados (veja docker-compose.yml):
//   docker compose run --rm e2e node scripts/dev/capturar-telas.mjs
// As fotos vão para .capturas/ (ou para a pasta em CAPTURAS_DIR).
import fs from 'node:fs'
import { chromium, devices } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const SAIDA = process.env.CAPTURAS_DIR ?? '.capturas'
// Conta de teste que só existe no banco local (supabase/seed.sql).
const ADMIN_LOCAL = { email: 'admin@77xp.local', senha: 'admin-local-77' }

fs.mkdirSync(SAIDA, { recursive: true })
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ ...devices['Pixel 7'] })
const pagina = await contexto.newPage()

async function medirLargura() {
    return pagina.evaluate(() => {
        const tela = document.documentElement.clientWidth
        const conteudo = document.documentElement.scrollWidth
        const culpados = []
        if (conteudo > tela) {
            for (const el of document.querySelectorAll('body *')) {
                const r = el.getBoundingClientRect()
                if (r.width > 0 && r.right > tela + 1) {
                    const classes = typeof el.className === 'string' ? el.className.split(' ').slice(0, 4).join('.') : ''
                    culpados.push(`${el.tagName.toLowerCase()}.${classes} (vai até ${Math.round(r.right)}px)`)
                }
            }
        }
        return { tela, conteudo, culpados: culpados.slice(0, 6) }
    })
}

// Desce a página aos poucos, como uma pessoa faria, para disparar as animações de entrada.
async function rolarAteOFim() {
    await pagina.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
            window.scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 60))
        }
        window.scrollTo(0, 0)
    })
}

async function fotografar(nome) {
    await rolarAteOFim()
    await pagina.waitForTimeout(1200) // animações de entrada
    const { tela, conteudo, culpados } = await medirLargura()
    await pagina.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true, scale: 'css' })
    console.log(`${nome}: tela ${tela}px, conteúdo ${conteudo}px ${conteudo > tela ? '⚠️  PASSA DA TELA' : '✓'}`)
    for (const c of culpados) console.log(`   - ${c}`)
}

for (const [nome, caminho] of [
    ['01-inicio', '/'],
    ['02-calculadora', '/calculadora'],
    ['03-contato', '/contato'],
    ['04-blog', '/blog'],
    ['05-login', '/admin/login'],
]) {
    await pagina.goto(BASE + caminho, { waitUntil: 'networkidle' })
    await fotografar(nome)
}

// Painel: entra com o admin de teste local
await pagina.fill('input[name=email]', ADMIN_LOCAL.email)
await pagina.fill('input[name=password]', ADMIN_LOCAL.senha)
await Promise.all([pagina.waitForURL(`${BASE}/admin`), pagina.getByRole('button', { name: 'Estabelecer Conexão' }).click()])
await pagina.waitForLoadState('networkidle')
await fotografar('06-painel-visao-geral')

await pagina.goto(`${BASE}/admin/crm`, { waitUntil: 'networkidle' })
await fotografar('07-painel-leads')

try {
    await pagina.getByText('Ana Souza').first().click({ timeout: 5000 })
    await fotografar('08-painel-gaveta-do-lead')
} catch {
    console.log('08-painel-gaveta-do-lead: ⚠️  não dá para tocar no card do lead (outro elemento está por cima)')
}

await pagina.goto(`${BASE}/admin/proposal/a0000000-0000-4000-8000-000000000006`, { waitUntil: 'networkidle' })
await fotografar('09-painel-proposta')

await navegador.close()
