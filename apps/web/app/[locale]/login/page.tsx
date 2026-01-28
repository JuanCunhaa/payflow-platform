'use client';

import Link from 'next/link';
import { useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useTenant } from '../../tenant-context';
import { useAuth } from '../../auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

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

  const pageTitle = tenant
    ? `${t(i18nKeys.login.title)} - ${tenant.name}`
    : t(i18nKeys.login.title);

  return (
    <AuthLayout title={pageTitle} description="Entre com suas credenciais para acessar o portal">
      <Card>
        <CardContent className="pt-6">
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
              <PasswordInput
                id="password"
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
            <Link
              href={`/${locale}/register/guardian`}
              className="font-medium text-primary hover:underline"
            >
              {t(i18nKeys.login.signup)}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
