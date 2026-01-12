'use client';

import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';

export default function LoginPage() {
  const { t, locale } = useI18n();

  return (
    <main style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '50px auto' }}>
      <nav style={{ marginBottom: '32px' }}>
        <Link href={locale === 'pt-BR' ? '/en-US' : '/pt-BR'}>
          {locale === 'pt-BR' ? 'English' : 'Português'}
        </Link>
      </nav>

      <h1>{t(i18nKeys.login.title)}</h1>

      <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '8px' }}>
            {t(i18nKeys.login.email)}
          </label>
          <input id="email" type="email" placeholder="user@example.com" style={{ width: '100%', padding: '8px' }} />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>
            {t(i18nKeys.login.password)}
          </label>
          <input id="password" type="password" style={{ width: '100%', padding: '8px' }} />
        </div>

        <button type="submit" style={{ padding: '10px', fontSize: '16px', cursor: 'pointer' }}>
          {t(i18nKeys.login.submit)}
        </button>
      </form>

      <p style={{ marginTop: '24px', textAlign: 'center' }}>
        {t(i18nKeys.login.noAccount)}{' '}
        <Link href={`/${locale}/signup`}>{t(i18nKeys.login.signup)}</Link>
      </p>

      <Link href={`/${locale}`} style={{ marginTop: '24px', display: 'block' }}>
        ← {t(i18nKeys.nav.home)}
      </Link>
    </main>
  );
}
