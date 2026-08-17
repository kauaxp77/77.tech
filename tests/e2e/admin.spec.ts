import { test, expect } from '@playwright/test';

test.describe('Admin CRM Security Lock', () => {
    test('Unauthenticated user is intercepted and routed to classified area', async ({ page }) => {
        // Tenta invadir o CRM diretamente
        await page.goto('/admin');

        // Verifica se a Edge Function interceptou e mudou a rota
        await expect(page).toHaveURL(/\/admin\/login/);

        // Valida o elemento visual da placa classificatória
        const heading = page.locator('h1:has-text("Acesso Classificado")');
        await expect(heading).toBeVisible();
    });

    test('Public pages remain accessible without cookies', async ({ page }) => {
        // Garante que o middleware não quebrou rotas que deveriam ser livres
        await page.goto('/');

        const heroTitle = page.locator('h1');
        await expect(heroTitle).toBeVisible();
    });
});
