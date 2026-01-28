'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useTenant } from '../../tenant-context';
import { useI18n } from '../../i18n-context';
import { MobileSidebar, Sidebar } from '@/components/sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  CheckSquare,
  FileText,
  GraduationCap,
  LifeBuoy,
  LogOut,
  Receipt,
  Settings,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Footer } from '@/components/footer';

type Crumb = {
  label: string;
  href?: string;
};

function buildBreadcrumbs(pathname: string, basePath: string, t: (key: string) => string): Crumb[] {
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
  } else if (first === 'invoices') {
    crumbs.push({
      label: t(i18nKeys.school.breadcrumbs.invoices),
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
  } else if (first === 'tickets') {
    crumbs.push({
      label: t(i18nKeys.school.nav.tickets),
    });
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

  const sidebarItems = [
    { href: basePath, label: t(i18nKeys.school.nav.dashboard), icon: BarChart3 },
    { href: `${basePath}/classes`, label: t(i18nKeys.school.nav.classes), icon: GraduationCap },
    { href: `${basePath}/students`, label: t(i18nKeys.school.nav.students), icon: Users },
    { href: `${basePath}/contracts`, label: t(i18nKeys.school.nav.contracts), icon: FileText },
    { href: `${basePath}/invoices`, label: t(i18nKeys.school.nav.invoices), icon: Receipt },
    { href: `${basePath}/tickets`, label: t(i18nKeys.school.nav.tickets), icon: LifeBuoy },
    { href: `${basePath}/guardians`, label: t(i18nKeys.school.nav.guardians), icon: UserCheck },
    {
      href: `${basePath}/approvals/guardians`,
      label: t(i18nKeys.school.nav.approvalsGuardians),
      icon: CheckSquare,
    },
    { href: `${basePath}/settings`, label: t(i18nKeys.school.nav.settings), icon: Settings },
  ];

  if (sessionLoading || isLoggingOut || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground animate-pulse">{t(i18nKeys.common.loading)}</p>
      </div>
    );
  }

  if (!isStaff || !hasTenantContext) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t(i18nKeys.school.layout.unauthorizedTitle)}</CardTitle>
            <CardDescription>{t(i18nKeys.school.layout.unauthorizedDescription)}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout} className="w-full">
              {t(i18nKeys.nav.logout)}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schoolName =
    user.tenant?.name || contextTenant?.slug || t(i18nKeys.dashboard.platformTenantFallback);
  const userLabel = user.name || user.email;

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar title="Cobra Nex" items={sidebarItems} className="fixed w-64 h-full" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-950">
        <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <MobileSidebar title="Cobra Nex" items={sidebarItems} />
            <div>
              <nav className="flex items-center text-sm text-muted-foreground mb-0.5">
                {breadcrumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`} className="flex items-center">
                    {index > 0 && <span className="mx-2">/</span>}
                    {crumb.href ? (
                      <Link href={crumb.href} className="hover:text-foreground transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
              <div className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {schoolName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {userLabel}
              </div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t(i18nKeys.nav.logout)}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
