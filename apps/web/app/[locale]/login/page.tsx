'use client';

import Link from 'next/link';
import { useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useTenant } from '../../tenant-context';
import { useAuth } from '../../auth-context';

export default function LoginPage() {
  const { t, locale } = useI18n();
  const { tenant } = useTenant();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, tenant?.slug ?? undefined);
    } catch (err) {
      // Error message is handled inside AuthProvider; we can still show a generic one
      if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError(t(i18nKeys.login.error.generic));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '50px auto' }}
    >
      <nav style={{ marginBottom: '32px' }}>
        <Link href={locale === 'pt-BR' ? '/en-US' : '/pt-BR'}>
          {locale === 'pt-BR'
            ? t(i18nKeys.common.language.english)
            : t(i18nKeys.common.language.portuguese)}
        </Link>
      </nav>

      {tenant && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '1px solid #bae6fd',
          }}
        >
          <strong>{tenant.name}</strong>
        </div>
      )}

      <h1>{t(i18nKeys.login.title)}</h1>

      {error && (
        <div
          style={{
            padding: '12px',
            background: '#fef2f2',
            color: '#dc2626',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '8px' }}>
            {t(i18nKeys.login.email)}
          </label>
          <input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>
            {t(i18nKeys.login.password)}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px',
            fontSize: '16px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? t(i18nKeys.common.loading) : t(i18nKeys.login.submit)}
        </button>
      </form>

      <p style={{ marginTop: '24px', textAlign: 'center' }}>
        {t(i18nKeys.login.noAccount)}{' '}
        <Link href={`/${locale}/signup`}>{t(i18nKeys.login.signup)}</Link>
      </p>

      <Link href={`/${locale}`} style={{ marginTop: '24px', display: 'block' }}>
        ← {t(i18nKeys.nav.home)}
      </Link>

      {/* Debug info for development */}
      <div
        style={{
          marginTop: '32px',
          padding: '12px',
          background: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '12px',
        }}
      >
        <strong>{t(i18nKeys.login.debug.title)}</strong>
        <br />
        {tenant?.slug === 'vidal' && (
          <>
            {t(i18nKeys.login.debug.emailLabel)}: admin@vidal.com
            <br />
          </>
        )}
        {tenant?.slug === 'alpha' && (
          <>
            {t(i18nKeys.login.debug.emailLabel)}: admin@alpha.com
            <br />
          </>
        )}
        {!tenant && (
          <>
            {t(i18nKeys.login.debug.emailLabel)}: platform.admin@payflow.com
            <br />
          </>
        )}
        {t(i18nKeys.login.debug.passwordLabel)}: Admin@12345
      </div>
    </main>
  );
}
