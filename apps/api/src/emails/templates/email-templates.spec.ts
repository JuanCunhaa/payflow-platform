import { renderEmailTemplate } from './index';

async function run() {
  const baseVariables = {
    name: 'Responsável Teste',
    school: 'Escola Exemplo',
    amount: 'R$ 100,00',
    dueDate: '10/02/2026',
    link: 'https://example.com',
  };

  const templateIds: Parameters<typeof renderEmailTemplate>[0][] = [
    'verify-email',
    'guardian-approved',
    'guardian-rejected',
    'invoice-created',
    'invoice-overdue',
    'invoice-paid',
  ];

  for (const id of templateIds) {
    const { html, text } = renderEmailTemplate(id, baseVariables);
    if (!html || !text) {
      throw new Error(`Template "${id}" returned empty html or text`);
    }
    if (!html.includes('Escola Exemplo') || !text.includes('Escola Exemplo')) {
      throw new Error(`Template "${id}" did not interpolate variables correctly`);
    }
  }

  console.log('Email template rendering tests passed');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
