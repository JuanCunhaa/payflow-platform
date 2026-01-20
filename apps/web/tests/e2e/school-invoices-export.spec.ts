import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';
const TENANT_VIDAL_EMAIL =
  process.env.PAYFLOW_E2E_VIDAL_EMAIL ?? 'admin@vidal.com';
const DEFAULT_PASSWORD =
  process.env.PAYFLOW_E2E_PASSWORD ?? 'Admin@12345';

async function loginAsSchoolAdmin(page: import('@playwright/test').Page) {
  await page.goto(`http://vidal.localtest.me:3000/${LOCALE}/login`);

  await page.getByLabel('Email').fill(TENANT_VIDAL_EMAIL);
  await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(
    new RegExp(`vidal\\.localtest\\.me:3000/${LOCALE}/s`),
  );
}

test.describe('School invoices export CSV', () => {
  test('opens export modal and starts download', async ({ page }) => {
    await loginAsSchoolAdmin(page);

    // Go to invoices page
    await page.getByRole('link', { name: 'Cobranças' }).click();

    // Open export modal
    await page.getByRole('button', { name: 'Exportar CSV' }).click();

    await expect(
      page.getByRole('heading', { name: 'Exportar cobranças em CSV' }),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent('download');

    await page
      .getByRole('button', { name: 'Exportar CSV' })
      .last()
      .click();

    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested).toContain('.csv');
  });
});

