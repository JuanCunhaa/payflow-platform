import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

const PLATFORM_EMAIL = process.env.PAYFLOW_E2E_PLATFORM_EMAIL ?? 'platform.admin@payflow.com';
const DEFAULT_PASSWORD = process.env.PAYFLOW_E2E_PASSWORD ?? 'Admin@12345';

async function loginAsPlatform(page: import('@playwright/test').Page) {
  await page.goto(`http://admin.localtest.me:3000/${LOCALE}/login`);

  await page.getByLabel('Email').fill(PLATFORM_EMAIL);
  await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(new RegExp(`admin\\.localtest\\.me:3000/${LOCALE}/p`));
}

test.describe('Platform admin area', () => {
  test('sidebar links to dashboard, tenants, leads and audit', async ({ page }) => {
    await loginAsPlatform(page);

    await expect(page.getByRole('link', { name: 'Plataforma' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Escolas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leads' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Auditoria' })).toBeVisible();
  });

  // Detalhes de tenants/leads/audit são cobertos em testes futuros
});
