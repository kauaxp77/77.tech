import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { DONO, garantirDono } from './helpers/dados'

test.beforeAll(async () => {
  await garantirDono()
})

/**
 * Quantos pixels a página passa da largura da tela. Tem de ser 0: no celular, um
 * pixel a mais já faz a tela deslizar para o lado, e quem usa acha que quebrou.
 */
async function estouroHorizontal(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

async function entrar(page: Page) {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(DONO.email)
  await page.getByLabel('Senha').fill(DONO.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)
}

test('o menu abre e fecha pelo ☰', async ({ page }) => {
  await entrar(page)

  const menu = page.locator('#menu-do-painel')
  await expect(menu).toBeHidden()

  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu).toBeVisible()

  await page.getByRole('button', { name: 'Fechar menu' }).click()
  await expect(menu).toBeHidden()

  // E pelo teclado também: quem abriu sem querer precisa de uma saída.
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})

test('o menu leva para as outras telas e se fecha sozinho', async ({ page }) => {
  await entrar(page)

  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.locator('#menu-do-painel').getByRole('link', { name: 'Contas de acesso' }).click()

  await expect(page).toHaveURL(/\/painel\/contas$/)
  await expect(page.locator('#menu-do-painel')).toBeHidden()
})

test('nenhuma tela sai da largura do celular', async ({ page }) => {
  await page.goto('/')
  expect(await estouroHorizontal(page), 'porta de entrada').toBe(0)

  await page.goto('/entrar')
  expect(await estouroHorizontal(page), 'tela de entrar').toBe(0)

  await entrar(page)
  expect(await estouroHorizontal(page), 'visão geral').toBe(0)

  await page.goto('/painel/contas')
  await expect(page.getByRole('heading', { name: 'Contas de acesso' })).toBeVisible()
  expect(await estouroHorizontal(page), 'contas de acesso').toBe(0)

  // Com o menu aberto por cima, que é quando a largura costuma estourar.
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.locator('#menu-do-painel')).toBeVisible()
  expect(await estouroHorizontal(page), 'contas com o menu aberto').toBe(0)

  await page.goto('/painel/conta')
  await expect(page.getByRole('heading', { name: 'Minha conta' })).toBeVisible()
  expect(await estouroHorizontal(page), 'minha conta').toBe(0)
})
