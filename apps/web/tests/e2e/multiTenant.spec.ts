import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

test.describe('Multi-tenant routing', () => {
  test('tenant host loads landing without error', async ({ page }) => {
    await page.goto(`http://vidal.localtest.me:3000/${LOCALE}`);
    await expect(page.getByRole('heading', { name: /Cobra Nex/i })).toBeVisible();
  });

  test('invalid tenant redirects to tenant-not-found', async ({ page }) => {
    await page.goto(`http://inexistente.localtest.me:3000/${LOCALE}/s`);

    await expect(page).toHaveURL(new RegExp(`/pt-BR/tenant-not-found$`));
    await expect(page.getByText('Escola não encontrada', { exact: false })).toBeVisible();
  });

  test('platform routes are blocked on tenant host', async ({ page }) => {
    await page.goto(`http://vidal.localtest.me:3000/${LOCALE}/p`);

    await expect(page).toHaveURL(new RegExp(`vidal\\.localtest\\.me:3000/${LOCALE}$`));
  });
});
