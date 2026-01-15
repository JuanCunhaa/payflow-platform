'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useTenant } from '../../tenant-context';
import { useAuth } from '../../auth-context';

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { tenant: contextTenant } = useTenant();
  const { user, sessionLoading, logout, isLoggingOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading || isLoggingOut) return;
    if (!user) {
      router.push(`/${locale}/login`);
    }
  }, [sessionLoading, isLoggingOut, user, locale, router]);

  if (sessionLoading || isLoggingOut || !user) {
    return (
      <main
        style={{
          padding: '24px',
          fontFamily: 'sans-serif',
          maxWidth: '800px',
          margin: '50px auto',
        }}
      >
        <p>{t(i18nKeys.common.loading)}</p>
      </main>
    );
  }

  return (
    <main
      style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '50px auto' }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{t(i18nKeys.dashboard.title)}</h1>
          {(user.tenant || contextTenant) && (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              {user.tenant?.name || contextTenant?.name}
            </span>
          )}
        </div>
        <button
          onClick={logout}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {t(i18nKeys.nav.logout)}
        </button>
      </header>

      <div
        style={{
          padding: '24px',
          background: '#f9fafb',
          borderRadius: '8px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          {t(i18nKeys.dashboard.welcome).replace('{name}', user.name ?? '')}
        </h2>
        <p style={{ margin: 0, color: '#6b7280' }}>
          {t(i18nKeys.dashboard.userTypeLabel)} <strong>{user.userType}</strong>
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ marginTop: 0 }}>📧 {t(i18nKeys.dashboard.emailLabel)}</h3>
          <p style={{ margin: 0, wordBreak: 'break-all' }}>{user.email}</p>
        </div>

        <div
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ marginTop: 0 }}>🏫 {t(i18nKeys.dashboard.tenantLabel)}</h3>
          <p style={{ margin: 0 }}>
            {user.tenant?.name ||
              contextTenant?.name ||
              t(i18nKeys.dashboard.platformTenantFallback)}
          </p>
        </div>

        <div
          style={{
            padding: '20px',
            background: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <h3 style={{ marginTop: 0 }}>👤 {t(i18nKeys.dashboard.userTypeLabel)}</h3>
          <p style={{ margin: 0 }}>{user.userType}</p>
        </div>
      </div>

      <div style={{ marginTop: '32px' }}>
        <Link href={`/${locale}`}>← {t(i18nKeys.dashboard.backToHome)}</Link>
      </div>
    </main>
  );
}
