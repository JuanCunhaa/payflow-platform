'use client';

import { useI18n } from '../../../i18n-context';

export default function RegisterGuardianPlaceholder() {
  const { t } = useI18n();

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'sans-serif',
        maxWidth: '600px',
        margin: '50px auto',
      }}
    >
      <h1>Sou responsável</h1>
      <p>
        Esta página será usada para cadastro de responsáveis. Por enquanto, use as credenciais de
        teste na tela de login para navegar pelo produto.
      </p>
    </main>
  );
}

