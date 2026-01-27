import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

test.describe('Public landing and navigation', () => {
  test('landing loads and shows main sections', async ({ page }) => {
    await page.goto(`/${LOCALE}`);

    await expect(page.getByRole('heading', { name: /Cobra Nex/i })).toBeVisible();
    await expect(
      page.getByRole('heading', {
        name: /Planilha, WhatsApp e comprovantes perdidos/i,
      })
    ).toBeVisible();
    await expect(page.getByText('Uma plataforma pensada para a rotina da escola')).toBeVisible();
  });

  test('CTAs navigate to login, guardian and request demo', async ({ page }) => {
    await page.goto(`/${LOCALE}`);

    await page.getByRole('button', { name: 'Entrar' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/login$`));

    await page.goto(`/${LOCALE}`);
    await page.getByRole('button', { name: 'Sou responsável' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/register/guardian$`));

    await page.goto(`/${LOCALE}`);
    await page.getByRole('button', { name: 'Quero na minha escola' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${LOCALE}/request-demo$`));
  });

  test('request demo form validates and submits', async ({ page }) => {
    await page.goto(`/${LOCALE}/request-demo`);

    await page.getByRole('button', { name: 'Solicitar demonstração' }).click();
    await expect(
      page.getByText('Verifique se todos os campos estão preenchidos corretamente.')
    ).toBeVisible();

    const email = `e2e+${Date.now()}@example.com`;

    await page.getByLabel('Nome do responsável').fill('E2E Tester');
    await page.getByLabel('Nome da escola').fill('Escola E2E');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Telefone').fill('11999999999');

    await page.getByRole('button', { name: 'Solicitar demonstração' }).click();

    await expect(page.getByText('Recebemos seu pedido!', { exact: false })).toBeVisible();
  });
});
