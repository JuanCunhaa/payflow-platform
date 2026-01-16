import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

const PLATFORM_EMAIL =
  process.env.PAYFLOW_E2E_PLATFORM_EMAIL ?? 'platform.admin@payflow.com';
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

async function loginAsPlatformAdmin(page: import('@playwright/test').Page) {
  await page.goto(`http://admin.localtest.me:3000/${LOCALE}/login`);

  await page.getByLabel('Email').fill(PLATFORM_EMAIL);
  await page.getByLabel('Senha').fill(DEFAULT_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test.describe('School settings and audit', () => {
  test('school admin can update settings and audit shows change', async ({
    page,
  }) => {
    // 1) Login como admin da escola Vidal e ir para /s/settings
    await loginAsSchoolAdmin(page);

    // Navega até /s/settings via sidebar para reaproveitar
    // a sessão atual, evitando um reload completo.
    await page.getByRole('link', { name: 'Configurações' }).click();

    // Espera carregar o formulário (heading da página)
    await expect(
      page.getByRole('heading', { name: 'Configurações da escola' }),
    ).toBeVisible();

    const newDisplayName = `Escola Vidal E2E ${Date.now()}`;

    await page.getByLabel('Nome da escola').fill(newDisplayName);
    await page.getByLabel('Email').fill('contato+e2e@vidal.com');
    await page.getByLabel('Telefone').fill('11999990000');

    await page
      .getByRole('button', { name: 'Salvar alterações' })
      .click();

    // Mensagem de sucesso específica de settings
    await expect(
      page.getByText(
        'Configurações da escola salvas com sucesso.',
      ),
    ).toBeVisible();

    // 2) Abrir painel da plataforma e conferir audit log
    await loginAsPlatformAdmin(page);

    await page.goto(
      `http://admin.localtest.me:3000/${LOCALE}/p/audit`,
    );

    // Filtro por action tenant.settings.update
    await page.getByLabel('Ação').fill('tenant.settings.update');
    await page.getByRole('button', { name: 'Aplicar filtros' }).click();

    // Deve existir pelo menos um registro com essa ação
    const row = page.getByRole('row').filter({
      hasText: 'tenant.settings.update',
    });

    await expect(row.first()).toBeVisible();

    // Abre detalhes e verifica que metadata contém o novo displayName
    await row.first().getByRole('button', { name: 'Ver detalhes' }).click();

    await expect(
      page.getByText('Detalhes do evento', { exact: false }),
    ).toBeVisible();

    await expect(
      page.getByText(newDisplayName, { exact: false }),
    ).toBeVisible();
  });
});
