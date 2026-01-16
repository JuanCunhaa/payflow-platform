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

test.describe('School classes UI', () => {
  test('can create grade and class and see them listed', async ({ page }) => {
    await loginAsSchoolAdmin(page);

    // Navega até /s/classes usando o menu lateral
    // para preservar o contexto de sessão atual.
    await page.getByRole('link', { name: 'Turmas' }).click();

    await expect(
      page.getByText('Séries e turmas', { exact: false }),
    ).toBeVisible();

    const gradeName = `E2E Série ${Date.now()}`;
    const className = `E2E Turma ${Date.now()}`;

    await page
      .getByRole('button', { name: 'Nova série' })
      .click();

    await page
      .getByLabel('Nome da série')
      .fill(gradeName);
    await page
      .getByRole('button', { name: 'Salvar' })
      .click();

    await expect(page.getByText(gradeName)).toBeVisible();

    await page
      .getByRole('button', { name: 'Turmas' })
      .click();

    await page
      .getByRole('button', { name: 'Nova turma' })
      .click();

    await page
      .getByLabel('Nome da turma')
      .fill(className);
    await page
      .getByRole('combobox')
      .last()
      .selectOption({ label: gradeName });

    await page
      .getByRole('button', { name: 'Salvar' })
      .click();

    await expect(page.getByText(className)).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: gradeName }).first(),
    ).toBeVisible();
  });
});
