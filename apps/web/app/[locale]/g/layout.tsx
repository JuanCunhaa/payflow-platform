'use client';

import type React from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useI18n } from '../../i18n-context';
import { MobileSidebar, Sidebar } from '@/components/sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { BookOpen, LayoutDashboard, LogOut, Receipt, UserCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type NavItem = {
  href: string;
  labelKey: string;
  icon: any;
};

const NAV_ITEMS: NavItem[] = [
  { href: '', labelKey: i18nKeys.guardian.nav.dashboard, icon: LayoutDashboard },
  { href: '/profile', labelKey: i18nKeys.guardian.nav.profile, icon: UserCircle },
  { href: '/students', labelKey: i18nKeys.guardian.nav.students, icon: BookOpen },
  { href: '/invoices', labelKey: i18nKeys.guardian.nav.invoices, icon: Receipt },
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
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground animate-pulse">{t(i18nKeys.common.loading)}</p>
      </div>
    );
  }

  if (user.userType !== 'GUARDIAN') {
    return null;
  }

  if (user.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t(i18nKeys.auth.pendingApproval.title)}</CardTitle>
            <CardDescription>{t(i18nKeys.auth.pendingApproval.description)}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={logout} variant="outline">
              {t(i18nKeys.nav.logout)}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const basePath = `/${locale}/g`;
  const sidebarItems = NAV_ITEMS.map(item => ({
    href: `${basePath}${item.href}`,
    label: t(item.labelKey),
    icon: item.icon
  }));

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar title="PayFlow" items={sidebarItems} className="fixed w-64 h-full" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-muted/40">
        <header className="sticky top-0 z-40 bg-background border-b px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <MobileSidebar title="PayFlow" items={sidebarItems} />
            <div>
              <div className="font-semibold text-lg text-foreground">
                {t(i18nKeys.guardian.pages.dashboard.title)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ModeToggle />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-foreground">{user.name || user.email}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t(i18nKeys.nav.logout)}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
