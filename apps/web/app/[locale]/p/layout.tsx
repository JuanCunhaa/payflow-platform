'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useAuth } from '../../auth-context';
import { useI18n } from '../../i18n-context';
import { MobileSidebar, Sidebar } from '@/components/sidebar';
import { ModeToggle } from '@/components/mode-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { Button } from '@/components/ui/button';
import { Activity, Building, LayoutDashboard, LogOut, Megaphone, LifeBuoy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, sessionLoading, isLoggingOut, logout } = useAuth();
  const { locale, t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (sessionLoading || isLoggingOut) return;
    if (!user || user.userType !== 'PLATFORM') {
      const base = locale || 'pt-BR';
      router.replace(`/${base}/login`);
    }
  }, [user, sessionLoading, isLoggingOut, router, locale]);

  const basePath = `/${locale}/p`;

  const sidebarItems = [
    { href: basePath, label: t(i18nKeys.platform.nav.dashboard), icon: LayoutDashboard },
    { href: `${basePath}/tenants`, label: t(i18nKeys.platform.nav.tenants), icon: Building },
    { href: `${basePath}/leads`, label: t(i18nKeys.platform.nav.leads), icon: Megaphone },
    { href: `${basePath}/tickets`, label: t(i18nKeys.platform.nav.tickets), icon: LifeBuoy },
    { href: `${basePath}/audit`, label: t(i18nKeys.platform.nav.audit), icon: Activity },
  ];

  if (sessionLoading || isLoggingOut || !user || user.userType !== 'PLATFORM') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground animate-pulse">{t(i18nKeys.common.loading)}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block w-64 shrink-0">
        <Sidebar title="PayFlow Admin" items={sidebarItems} className="fixed w-64 h-full" />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-muted/40">
        <header className="sticky top-0 z-40 bg-background border-b px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <MobileSidebar title="PayFlow Admin" items={sidebarItems} />
            <div className="font-semibold text-lg text-foreground">
              {t(i18nKeys.platform.nav.dashboard)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ModeToggle />
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
