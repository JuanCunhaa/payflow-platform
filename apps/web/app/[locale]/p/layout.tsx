'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useI18n } from '../../i18n-context';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, isLoggingOut } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading || isLoggingOut) return;
    if (!user || user.userType !== 'PLATFORM') {
      const base = locale || 'pt-BR';
      router.replace(`/${base}/login`);
    }
  }, [user, sessionLoading, isLoggingOut, router, locale]);

  if (sessionLoading || isLoggingOut || !user || user.userType !== 'PLATFORM') {
    return (
      <main
        style={{
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {t(i18nKeys.common.loading)}
      </main>
    );
  }

  const basePath = `/${locale}/p`;

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <aside
        style={{
          width: '220px',
          borderRight: '1px solid #e2e8f0',
          padding: '20px 16px',
          backgroundColor: '#0f172a',
          color: '#e5e7eb',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: '18px',
            marginBottom: '24px',
          }}
        >
          PayFlow Admin
        </div>
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          <Link href={basePath} style={{ color: '#e5e7eb', textDecoration: 'none' }}>
            {t(i18nKeys.platform.nav.dashboard)}
          </Link>
          <Link href={`${basePath}/tenants`} style={{ color: '#e5e7eb', textDecoration: 'none' }}>
            {t(i18nKeys.platform.nav.tenants)}
          </Link>
          <Link href={`${basePath}/leads`} style={{ color: '#e5e7eb', textDecoration: 'none' }}>
            {t(i18nKeys.platform.nav.leads)}
          </Link>
          <Link href={`${basePath}/audit`} style={{ color: '#e5e7eb', textDecoration: 'none' }}>
            {t(i18nKeys.platform.nav.audit)}
          </Link>
        </nav>
      </aside>
      <main
        style={{
          flex: 1,
          padding: '24px',
          backgroundColor: '#f8fafc',
        }}
      >
        {children}
      </main>
    </div>
  );
}
