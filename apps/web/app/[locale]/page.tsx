'use client';

import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../i18n-context';

export default function Home() {
  const { t, locale } = useI18n();

  return (
    <main
      style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}
    >
      <nav style={{ marginBottom: '32px' }}>
        <Link href={locale === 'pt-BR' ? '/en-US/login' : '/pt-BR/login'}>
          {locale === 'pt-BR'
            ? t(i18nKeys.common.language.english)
            : t(i18nKeys.common.language.portuguese)}
        </Link>
      </nav>

      <h1>{t(i18nKeys.landing.title)}</h1>
      <p>{t(i18nKeys.landing.subtitle)}</p>
      <p>{t(i18nKeys.landing.description)}</p>

      <Link href={`/${locale}/login`}>
        <button style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
          {t(i18nKeys.landing.cta)}
        </button>
      </Link>
    </main>
  );
}
