'use client';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../i18n/provider';

export default function Home() {
  const { t } = useI18n();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>{t(i18nKeys.web.title)}</h1>
      <p>
        {t(i18nKeys.web.labels.api)}: {apiUrl ?? t(i18nKeys.web.messages.apiNotConfigured)}
      </p>
      <p>
        {t(i18nKeys.web.labels.i18n)}: {t(i18nKeys.common.ok)}
      </p>
    </main>
  );
}
