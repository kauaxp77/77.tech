import { test, expect } from '@playwright/test';

test('Must render main SEO attributes and Brand visibility', async ({ page }) => {
    await page.goto('/');

    // Title validation ensures document root metadata acts correctly 
    await expect(page).toHaveTitle(/77xp|Tech Solutions/i);

    // Validate hero rendering ensuring the glassmorphism CTA's are clickable
    const mainCTA = page.getByRole('link', { name: /Conhecer Soluções|Acessar Calculadora/i }).first();
    await expect(mainCTA).toBeVisible();
});

test('Typeform Calculator Wizard Navigation Integration', async ({ page }) => {
    await page.goto('/');

    // Find the primary entry point to module B (Calculadora)
    const calcLink = page.getByRole('link', { name: /Acessar Calculadora/i }).first();
    await calcLink.click();

    // Validate Router injected context
    await expect(page).toHaveURL(/.*calculadora/);

    // Assert Wizard renders Step 1 instead of crashing (validates Zustand Provider)
    await expect(page.getByText('O que você deseja construir?')).toBeVisible();
});
