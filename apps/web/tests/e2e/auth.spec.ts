import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

const PLATFORM_EMAIL = process.env.PAYFLOW_E2E_PLATFORM_EMAIL ?? 'platform.admin@payflow.com';
const TENANT_VIDAL_EMAIL = process.env.PAYFLOW_E2E_VIDAL_EMAIL ?? 'admin@vidal.com';
const DEFAULT_PASSWORD = process.env.PAYFLOW_E2E_PASSWORD ?? 'Admin@12345';

test.describe('Authentication flows', () => {
  test('invalid login shows generic error', async ({ page }) => {
    await page.goto(`/${LOCALE}/login`);

    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Senha').fill('invalid');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(
      page.getByText(/Falha no login|Erro de conexão|Muitas tentativas/i),
    ).toBeVisible();
  });

  test('platform admin login on admin host redirects to /p', async ({ page }) => {
    await page.goto(`http://admin.localtest.me:3000/${LOCALE}/login`);

    await page.getByLabel('Email').fill(PLATFORM_EMAIL);
    await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(new RegExp(`admin\\.localtest\\.me:3000/${LOCALE}/p`));
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('staff login on tenant host redirects to /s dashboard', async ({ page }) => {
    await page.goto(`http://vidal.localtest.me:3000/${LOCALE}/login`);

    await page.getByLabel('Email').fill(TENANT_VIDAL_EMAIL);
    await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(new RegExp(`vidal\\.localtest\\.me:3000/${LOCALE}/s`));
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Vidal Admin/i }),
    ).toBeVisible();
  });

  test('logout redirects back to landing', async ({ page }) => {
    await page.goto(`http://vidal.localtest.me:3000/${LOCALE}/login`);

    await page.getByLabel('Email').fill(TENANT_VIDAL_EMAIL);
    await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/s`));

    await page.getByRole('button', { name: 'Sair' }).click();

    await expect(page).toHaveURL(new RegExp(`/${LOCALE}$`));
  });
});
