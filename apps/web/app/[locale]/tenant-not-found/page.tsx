'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';

export default function TenantNotFoundLocalized() {
  const { t } = useI18n();

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem' }}>
      <h1>{t(i18nKeys.tenant.notFound.title)}</h1>
      <p>{t(i18nKeys.tenant.notFound.description)}</p>
      <p>{t(i18nKeys.tenant.notFound.extra)}</p>
    </main>
  );
}
