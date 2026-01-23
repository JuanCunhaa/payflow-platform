import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

const TENANT_VIDAL_EMAIL = process.env.PAYFLOW_E2E_VIDAL_EMAIL ?? 'admin@vidal.com';
const DEFAULT_PASSWORD = process.env.PAYFLOW_E2E_PASSWORD ?? 'Admin@12345';

async function loginAsSchoolAdmin(page: import('@playwright/test').Page) {
  await page.goto(`http://vidal.localtest.me:3000/${LOCALE}/login`);

  await page.getByLabel('Email').fill(TENANT_VIDAL_EMAIL);
  await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(new RegExp(`vidal\\.localtest\\.me:3000/${LOCALE}/s`));
}

test.describe('School financial dashboard', () => {
  test('shows KPI cards and period filter', async ({ page }) => {
    await loginAsSchoolAdmin(page);

    await expect(page.getByRole('heading', { name: 'Visão geral da escola' })).toBeVisible();

    await expect(page.getByLabel('Período')).toBeVisible();

    await expect(page.getByText('Faturado')).toBeVisible();
    await expect(page.getByText('Em aberto')).toBeVisible();
    await expect(page.getByText('Vencido')).toBeVisible();
    await expect(page.getByText('Qtd. vencidas')).toBeVisible();
  });
});
