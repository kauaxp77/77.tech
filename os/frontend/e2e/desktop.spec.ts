import { expect, test } from '@playwright/test'
import { DONO, emailNovo, garantirDono } from './helpers/dados'
import { esperarEmail, limparCaixa, linkDoEmail } from './helpers/mailpit'

test.beforeAll(async () => {
  await garantirDono()
})

async function entrar(page: import('@playwright/test').Page, email: string, senha: string) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha').fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('o dono convida um cliente, que cria a senha e entra na área dele', async ({ page }) => {
  await limparCaixa()

  await entrar(page, DONO.email, DONO.senha)
  await expect(page).toHaveURL(/\/painel$/)

  await page.getByRole('link', { name: 'Contas de acesso' }).click()
  const convidado = emailNovo('cliente')
  await page.getByLabel('E-mail').fill(convidado)
  await page.getByLabel('Nome').fill('Cliente de Teste')
  await page.getByLabel('Tipo de conta').selectOption('CLIENT')
  await page.getByRole('button', { name: 'Convidar' }).click()

  const linha = page.getByRole('listitem').filter({ hasText: convidado })
  await expect(linha).toContainText('Aguardando primeiro acesso')

  // O convite saiu de verdade: passou pela fila e chegou no servidor de e-mail.
  const link = linkDoEmail(await esperarEmail(convidado))

  await page.getByRole('link', { name: 'Minha conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()

  await page.goto(link)
  await page.getByLabel('Nova senha', { exact: true }).fill('cliente-de-teste-77xp')
  await page.getByLabel('Repita a nova senha').fill('cliente-de-teste-77xp')
  await page.getByRole('button', { name: 'Criar senha' }).click()
  await expect(page).toHaveURL(/\/entrar/)

  await entrar(page, convidado, 'cliente-de-teste-77xp')
  await expect(page).toHaveURL(/\/minha-conta$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Bem-vindo')
})

test('o cliente não entra no painel nem pela barra de endereço', async ({ page }) => {
  await limparCaixa()

  await entrar(page, DONO.email, DONO.senha)
  await page.getByRole('link', { name: 'Contas de acesso' }).click()
  const convidado = emailNovo('barrado')
  await page.getByLabel('E-mail').fill(convidado)
  await page.getByLabel('Nome').fill('Cliente Barrado')
  await page.getByLabel('Tipo de conta').selectOption('CLIENT')
  await page.getByRole('button', { name: 'Convidar' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: convidado })).toBeVisible()

  const link = linkDoEmail(await esperarEmail(convidado))

  // Sair primeiro: com a sessão do dono aberta, /entrar leva direto ao painel — que é
  // o comportamento certo, e por isso o teste precisa encerrar a sessão antes.
  await page.getByRole('link', { name: 'Minha conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar/)

  await page.goto(link)
  await page.getByLabel('Nova senha', { exact: true }).fill('cliente-barrado-77xp')
  await page.getByLabel('Repita a nova senha').fill('cliente-barrado-77xp')
  await page.getByRole('button', { name: 'Criar senha' }).click()

  await entrar(page, convidado, 'cliente-barrado-77xp')
  await expect(page).toHaveURL(/\/minha-conta$/)

  await page.goto('/painel/contas')
  await expect(page).toHaveURL(/\/minha-conta$/)
  await expect(page.getByText('Contas de acesso')).toHaveCount(0)
})

test('sair encerra a sessão, e o botão voltar do navegador não a ressuscita', async ({ page }) => {
  await entrar(page, DONO.email, DONO.senha)
  await expect(page).toHaveURL(/\/painel$/)

  await page.getByRole('link', { name: 'Minha conta' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/entrar/)

  // Voltar mostra a tela do cache, mas o servidor não entrega mais nada: a tela
  // descobre isso e manda para o login de novo.
  await page.goBack()
  await expect(page).toHaveURL(/\/entrar/)
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})
