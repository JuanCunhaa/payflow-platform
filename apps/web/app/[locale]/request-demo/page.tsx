'use client';

import { useI18n } from '../../i18n-context';

export default function RequestDemoPlaceholder() {
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
      <h1>Quero o PayFlow na minha escola</h1>
      <p>
        Em breve você poderá solicitar uma demo por aqui. Por enquanto, use as credenciais de teste
        na tela de login para explorar o painel como plataforma e como escola.
      </p>
    </main>
  );
}

