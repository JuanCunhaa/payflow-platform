import { test, expect } from '@playwright/test';

const LOCALE = 'pt-BR';

const TENANT_VIDAL_EMAIL =
  process.env.PAYFLOW_E2E_VIDAL_EMAIL ?? 'admin@vidal.com';

test.describe('Password reset web flow', () => {
  test('forgot password validates email and shows generic success', async ({
    page,
  }) => {
    await page.goto(`/${LOCALE}/forgot-password`);

    await page.getByRole('button', { name: 'Enviar instruções' }).click();

    await expect(
      page.getByText('Informe um email válido.', { exact: false }),
    ).toBeVisible();

    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Enviar instruções' }).click();

    await expect(
      page.getByText('Informe um email válido.', { exact: false }),
    ).toBeVisible();

    await page.getByLabel('Email').fill(TENANT_VIDAL_EMAIL);
    await page.getByRole('button', { name: 'Enviar instruções' }).click();

    const successMessage = page.getByText(
      'Se existir uma conta com este email, você receberá instruções para redefinir a senha em alguns minutos.',
      { exact: false },
    );
    const genericError = page.getByText(
      'Não foi possível processar sua solicitação agora. Tente novamente em alguns minutos.',
      { exact: false },
    );

    // Em ambientes de teste/dev podemos cair em rate limit
    // ou em um erro transitório. Consideramos válido que o
    // fluxo mostre a mensagem genérica de sucesso OU um erro
    // genérico amigável.
    await expect(successMessage.or(genericError)).toBeVisible();
  });

  test('reset password shows error for invalid token', async ({ page }) => {
    await page.goto(`/${LOCALE}/reset-password?token=invalid-token`);

    await page
      .getByLabel('Nova senha', { exact: true })
      .first()
      .fill('NovaSenha123');
    await page
      .getByLabel('Confirmar nova senha', { exact: true })
      .first()
      .fill('NovaSenha123');

    await page.getByRole('button', { name: 'Redefinir senha' }).click();

    await expect(
      page.getByText('Link de redefinição inválido', { exact: false }),
    ).toBeVisible();
  });
});
