'use client';

import type React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useI18n } from '../../i18n-context';

type NavItem = {
  href: string;
  labelKey: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '', labelKey: i18nKeys.guardian.nav.dashboard },
  { href: '/students', labelKey: i18nKeys.guardian.nav.students },
  { href: '/invoices', labelKey: i18nKeys.guardian.nav.invoices },
];

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, isLoggingOut, logout } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (sessionLoading || isLoggingOut) return;

    if (!user) {
      const base = locale || 'pt-BR';
      router.replace(`/${base}/login`);
      return;
    }

    if (user.userType !== 'GUARDIAN') {
      const base = locale || 'pt-BR';
      router.replace(`/${base}`);
    }
  }, [sessionLoading, isLoggingOut, user, locale, router]);

  if (sessionLoading || isLoggingOut || !user) {
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

  if (user.userType !== 'GUARDIAN') {
    return null;
  }

  if (user.status !== 'ACTIVE') {
    return (
      <main
        style={{
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          maxWidth: '600px',
          margin: '50px auto',
        }}
      >
        <h1>{t(i18nKeys.auth.pendingApproval.title)}</h1>
        <p>{t(i18nKeys.auth.pendingApproval.description)}</p>
      </main>
    );
  }

  const basePath = `/${locale}/g`;

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
          backgroundColor: '#020617',
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
          PayFlow
        </div>
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '14px',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = pathname === href;
            return (
              <Link
                key={item.href}
                href={href}
                style={{
                  color: isActive ? '#e5e7eb' : '#9ca3af',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main
        style={{
          flex: 1,
          padding: '24px',
          backgroundColor: '#f8fafc',
        }}
      >
        <header
          style={{
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              {t(i18nKeys.guardian.pages.dashboard.title)}
            </div>
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                margin: 0,
              }}
            >
              {t(i18nKeys.guardian.pages.dashboard.description)}
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                textAlign: 'right',
                fontSize: '13px',
                color: '#0f172a',
              }}
            >
              <div>{user.name || user.email}</div>
              <div
                style={{
                  color: '#64748b',
                }}
              >
                {user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {t(i18nKeys.nav.logout)}
            </button>
          </div>
        </header>

        <section>{children}</section>
      </main>
    </div>
  );
}

