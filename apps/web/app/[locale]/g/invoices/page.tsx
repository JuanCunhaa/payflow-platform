'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';

export default function GuardianInvoicesPage() {
  const { t } = useI18n();

  return (
    <section
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: '8px',
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {t(i18nKeys.guardian.pages.invoices.title)}
      </h1>
      <p
        style={{
          margin: 0,
          marginBottom: '8px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        {t(i18nKeys.guardian.pages.invoices.description)}
      </p>
    </section>
  );
}
