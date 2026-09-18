import { createClient } from '@supabase/supabase-js';
import { expect, test, type Page } from '@playwright/test';

// Estes testes usam o ambiente LOCAL: npx supabase start (+ supabase/seed.sql) e
// docker compose up app. Rode com: docker compose run --rm e2e

// Conta de teste que só existe no banco local (supabase/seed.sql).
const ADMIN_LOCAL = { email: 'admin@77xp.local', senha: 'admin-local-77' };
const ANA = 'a0000000-0000-4000-8000-000000000001'; // lead em "Novos Contatos" no seed
const FELIPE = 'a0000000-0000-4000-8000-000000000006'; // lead em negociação no seed

// Acesso de serviço ao banco local, só para desfazer o que os testes mudam.
const bancoLocal = createClient(process.env.SUPABASE_URL ?? 'http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '', {
    auth: { persistSession: false },
});

async function entrarComoAdmin(page: Page) {
    await page.goto('/admin/login');
    await page.fill('input[name=email]', ADMIN_LOCAL.email);
    await page.fill('input[name=password]', ADMIN_LOCAL.senha);
    await Promise.all([page.waitForURL(/\/admin$/), page.getByRole('button', { name: 'Estabelecer Conexão' }).click()]);
}

async function abrirSecao(page: Page, secao: string) {
    const botaoMenu = page.getByRole('button', { name: 'Abrir menu' });
    if (await botaoMenu.isVisible()) await botaoMenu.click();
    await page.getByRole('link', { name: secao, exact: true }).click();
}

test.describe('menu do painel', () => {
    test.beforeEach(async ({ page }) => entrarComoAdmin(page));

    for (const [secao, caminho] of [
        ['Leads', '/admin/crm'],
        ['Reuniões', '/admin/reunioes'],
        ['Propostas', '/admin/propostas'],
    ]) {
        test(`leva à seção ${secao}`, async ({ page }) => {
            await abrirSecao(page, secao);

            await expect(page).toHaveURL(new RegExp(`${caminho}$`));
            await expect(page.getByRole('heading', { level: 1, name: secao })).toBeVisible();
        });
    }

    test('volta para a Visão geral', async ({ page }) => {
        await page.goto('/admin/crm');

        await abrirSecao(page, 'Visão geral');

        await expect(page).toHaveURL(/\/admin$/);
        await expect(page.getByRole('heading', { level: 1, name: 'Visão geral' })).toBeVisible();
    });
});

test.describe('painel no celular', () => {
    test.beforeEach(async ({ page }) => {
        test.skip(test.info().project.name !== 'celular', 'só no celular');
        await entrarComoAdmin(page);
    });

    for (const caminho of ['/admin', '/admin/crm', '/admin/reunioes', '/admin/propostas', `/admin/proposal/${FELIPE}`]) {
        test(`${caminho} usa a largura toda e nada sai da tela`, async ({ page }) => {
            await page.goto(caminho);

            const medida = await page.evaluate(() => {
                const tela = document.documentElement.clientWidth;
                const principal = document.querySelector('main')!.getBoundingClientRect();
                // Quadros com rolagem lateral de propósito (colunas de leads) ficam de fora.
                const saindo = [...document.querySelectorAll('main *')].filter((el) => {
                    if (el.closest('[data-rolagem-horizontal]')) return false;
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.right > tela + 1;
                }).length;
                return { tela, larguraPrincipal: principal.width, saindo };
            });

            expect(medida.larguraPrincipal).toBeGreaterThanOrEqual(medida.tela - 1);
            expect(medida.saindo).toBe(0);
        });
    }
});

test.describe('leads', () => {
    test.beforeEach(async ({ page }) => entrarComoAdmin(page));

    test.afterEach(async () => {
        await bancoLocal.from('leads').update({ status: 'NOVO' }).eq('id', ANA);
        await bancoLocal.from('audit_logs').delete().eq('entity_id', ANA);
    });

    test('tocar no card abre a gaveta e "Mover para" muda a etapa do lead', async ({ page }) => {
        await page.goto('/admin/crm');

        await page.getByRole('region', { name: 'Novos Contatos' }).getByRole('button', { name: /Ana Souza/ }).click();
        const gaveta = page.getByRole('dialog', { name: 'Ana Souza' });
        await gaveta.getByLabel('Mover para').selectOption({ label: 'Em Contato' });

        await expect(page.getByRole('region', { name: 'Em Contato' }).getByText('Ana Souza')).toBeVisible();

        // A tela muda na hora; espera o banco confirmar antes de recarregar a página.
        await expect
            .poll(async () => (await bancoLocal.from('leads').select('status').eq('id', ANA).single()).data?.status)
            .toBe('CONTATO');
        await page.reload();
        await expect(page.getByRole('region', { name: 'Em Contato' }).getByText('Ana Souza')).toBeVisible();
    });
});

test.describe('reuniões', () => {
    test.beforeEach(async ({ page }) => entrarComoAdmin(page));

    test.afterEach(async () => {
        await bancoLocal.from('meetings').delete().like('title', 'Reunião E2E%');
    });

    test('marcar e apagar uma reunião pela aba Reuniões (horário de Brasília)', async ({ page }) => {
        const assunto = `Reunião E2E ${test.info().project.name}`;
        const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
        await page.goto('/admin/reunioes');

        const formulario = page.getByRole('form', { name: 'Marcar reunião' });
        await formulario.getByLabel('Lead').selectOption({ label: 'Felipe Castro — Castro Imóveis' });
        await formulario.getByLabel('Assunto').fill(assunto);
        await formulario.getByLabel('Data').fill(amanha);
        await formulario.getByLabel('Horário').fill('10:00');
        await formulario.getByLabel('Plataforma').selectOption('Google Meet');
        await formulario.getByLabel('Link da chamada').fill('https://meet.google.com/e2e-teste');
        await formulario.getByRole('button', { name: 'Marcar reunião' }).click();

        const proximas = page.getByRole('region', { name: 'Próximas reuniões' });
        const reuniao = proximas.getByRole('listitem').filter({ hasText: assunto });
        await expect(reuniao).toBeVisible();
        await expect(reuniao).toContainText('às 10:00');

        page.once('dialog', (dialogo) => dialogo.accept());
        await reuniao.getByRole('button', { name: `Excluir reunião ${assunto}` }).click();
        await expect(proximas.getByText(assunto)).toHaveCount(0);
    });
});

test.describe('propostas e visão geral', () => {
    test.beforeEach(async ({ page }) => entrarComoAdmin(page));

    test('Propostas lista quem está em negociação ou fechado, com o link da proposta', async ({ page }) => {
        await page.goto('/admin/propostas');
        const principal = page.getByRole('main');

        await expect(principal.getByText('Felipe Castro')).toBeVisible();
        await expect(principal.getByText('Henrique Alves')).toBeVisible();
        await expect(principal.getByText('Ana Souza')).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Abrir proposta de Felipe Castro' })).toHaveAttribute('href', `/admin/proposal/${FELIPE}`);
    });

    test('Visão geral mostra as próximas reuniões, com link para a aba Reuniões', async ({ page }) => {
        const bloco = page.getByRole('region', { name: 'Próximas reuniões' });

        await expect(bloco.getByText('Apresentação da proposta — Castro Imóveis')).toBeVisible();
        await expect(bloco.getByText('Alinhamento de escopo — Nunes Fit')).toHaveCount(0);
        await expect(bloco.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/admin/reunioes');
    });

    test('o alerta de leads parados leva para a seção Leads', async ({ page }) => {
        const resolver = page.getByRole('link', { name: 'Resolver agora' });

        await expect(resolver).toBeVisible();
        await expect(resolver).toHaveAttribute('href', '/admin/crm');
    });
});
