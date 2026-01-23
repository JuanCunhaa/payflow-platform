'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useTenant } from '../../tenant-context';
import { useAuth } from '../../auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Home, LogOut, Mail, User } from 'lucide-react';

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
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground animate-pulse">{t(i18nKeys.common.loading)}</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <header className="flex items-center justify-between mb-8 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t(i18nKeys.dashboard.title)}</h1>
          {(user.tenant || contextTenant) && (
            <p className="text-muted-foreground mt-1">
              {user.tenant?.name || contextTenant?.name}
            </p>
          )}
        </div>
        <Button variant="destructive" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          {t(i18nKeys.nav.logout)}
        </Button>
      </header>

      <Card className="mb-8 bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-xl">
            {t(i18nKeys.dashboard.welcome).replace('{name}', user.name ?? '')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t(i18nKeys.dashboard.userTypeLabel)} <strong className="text-foreground">{user.userType}</strong>
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(i18nKeys.dashboard.emailLabel)}
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate" title={user.email ?? ''}>{user.email}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(i18nKeys.dashboard.tenantLabel)}
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {user.tenant?.name ||
                contextTenant?.name ||
                t(i18nKeys.dashboard.platformTenantFallback)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t(i18nKeys.dashboard.userTypeLabel)}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{user.userType}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Link href={`/${locale}`}>
          <Button variant="link" className="pl-0 gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeftIcon className="h-4 w-4" />
            {t(i18nKeys.dashboard.backToHome)}
          </Button>
        </Link>
      </div>
    </div>
  );
}

function ArrowLeftIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}
