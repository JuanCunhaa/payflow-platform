'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useTenant } from '../../tenant-context';
import { useI18n } from '../../i18n-context';

type Crumb = {
  label: string;
  href?: string;
};

function buildBreadcrumbs(
  pathname: string,
  basePath: string,
  t: (key: string) => string
): Crumb[] {
  const withoutQuery = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  const segments = withoutQuery.split('/').filter(Boolean);

  // expected: /{locale}/s[/...]
  const sub = segments.slice(2); // drop locale + 's'

  const crumbs: Crumb[] = [
    {
      label: t(i18nKeys.school.breadcrumbs.root),
      href: basePath,
    },
    {
      label: t(i18nKeys.school.breadcrumbs.dashboard),
      href: basePath,
    },
  ];

  if (sub.length === 0) {
    return crumbs;
  }

  const [first, second] = sub;

  if (first === 'settings') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.settings),
    });
  } else if (first === 'classes') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.classes),
    });
  } else if (first === 'students') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.students),
    });
  } else if (first === 'contracts') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.contracts),
    });
  } else if (first === 'guardians') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.guardians),
    });
  } else if (first === 'approvals') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.approvals),
    });
    if (second === 'guardians') {
      crumbs.push({
        label: t(i18nKeys.school.breadcrumbs.approvalsGuardians),
      });
    }
  }

  return crumbs;
}

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, isLoggingOut, logout } = useAuth();
  const { tenant: contextTenant } = useTenant();
  const { locale, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (sessionLoading || isLoggingOut) return;
    if (!user) {
      const base = locale || 'pt-BR';
      router.replace(`/${base}/login`);
    }
  }, [sessionLoading, isLoggingOut, user, locale, router]);

  const basePath = `/${locale}/s`;

  const isStaff = !!user && user.userType === 'STAFF';
  const hasTenantContext = !!(user?.tenant || contextTenant);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(pathname, basePath, (key) => t(key)),
    [pathname, basePath, t]
  );

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

  if (!isStaff || !hasTenantContext) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#f8fafc',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 25px rgba(15,23,42,0.08)',
          }}
        >
          <h1
            style={{
              fontSize: '20px',
              marginBottom: '8px',
            }}
          >
            {t(i18nKeys.school.layout.unauthorizedTitle)}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
              marginBottom: '16px',
            }}
          >
            {t(i18nKeys.school.layout.unauthorizedDescription)}
          </p>
          <button
            type="button"
            onClick={logout}
            style={{
              padding: '8px 14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {t(i18nKeys.nav.logout)}
          </button>
        </div>
      </main>
    );
  }

  const schoolName =
    user.tenant?.name || contextTenant?.slug || t(i18nKeys.dashboard.platformTenantFallback);
  const userLabel = user.name || user.email;

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
          <Link href={basePath} style={{ color: '#e5e7eb', textDecoration: 'none' }}>
            {t(i18nKeys.school.nav.dashboard)}
          </Link>
          <Link
            href={`${basePath}/settings`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.settings)}
          </Link>
          <Link
            href={`${basePath}/classes`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.classes)}
          </Link>
          <Link
            href={`${basePath}/contracts`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.contracts)}
          </Link>
          <Link
            href={`${basePath}/students`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.students)}
          </Link>
          <Link
            href={`${basePath}/guardians`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.guardians)}
          </Link>
          <Link
            href={`${basePath}/approvals/guardians`}
            style={{ color: '#e5e7eb', textDecoration: 'none' }}
          >
            {t(i18nKeys.school.nav.approvalsGuardians)}
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
                fontSize: '14px',
                color: '#94a3b8',
                marginBottom: '4px',
              }}
            >
              {breadcrumbs.map((crumb, index) => (
                <span key={`${crumb.label}-${index}`}>
                  {index > 0 && ' / '}
                  {crumb.href ? (
                    <Link href={crumb.href} style={{ color: '#64748b', textDecoration: 'none' }}>
                      {crumb.label}
                    </Link>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </span>
              ))}
            </div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 600,
              }}
            >
              {schoolName}
            </div>
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
              <div>{userLabel}</div>
              <div style={{ color: '#64748b' }}>{user.email}</div>
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
