'use client';

import Link from 'next/link';
import { useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useTenant } from '../../tenant-context';
import { useAuth } from '../../auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

export default function LoginPage() {
  const { t, locale } = useI18n();
  const { tenant } = useTenant();
  const { login, loginError, clearLoginError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginError();
    setLoading(true);

    try {
      await login(email, password, tenant?.slug ?? undefined);
    } catch {
      // Error is handled by AuthProvider via loginError
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center mb-2">
            <Link
              href={`/${locale}`}
              className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              {t(i18nKeys.nav.home)}
            </Link>
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">PayFlow</span>
              {tenant && <span className="mx-1">&middot; {tenant.name}</span>}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t(i18nKeys.login.title)}</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar o portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <p>{loginError}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t(i18nKeys.login.email)}</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t(i18nKeys.login.password)}</Label>
                <Link
                  href={`/${locale}/forgot-password`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t(i18nKeys.login.forgotPassword)}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t(i18nKeys.common.loading) : t(i18nKeys.login.submit)}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <p className="text-sm text-muted-foreground">
            {t(i18nKeys.login.noAccount)}{' '}
            <Link href={`/${locale}/register/guardian`} className="font-medium text-primary hover:underline">
              {t(i18nKeys.login.signup)}
            </Link>
          </p>
        </CardFooter>
      </Card>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ModeToggle />
        <Link
          href={locale === 'pt-BR' ? '/en-US' : '/pt-BR'}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {locale === 'pt-BR'
            ? t(i18nKeys.common.language.english)
            : t(i18nKeys.common.language.portuguese)}
        </Link>
      </div>
    </div >
  );
}
