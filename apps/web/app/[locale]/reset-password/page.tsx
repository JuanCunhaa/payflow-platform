'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token') ?? '';
    setToken(fromQuery);
  }, [searchParams]);

  function validateLocally(): boolean {
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm || trimmedPassword !== trimmedConfirm) {
      setError(t(i18nKeys.passwordReset.reset.error.validation));
      return false;
    }

    if (
      trimmedPassword.length < 8 ||
      !/[A-Za-z]/.test(trimmedPassword) ||
      !/\d/.test(trimmedPassword)
    ) {
      setError(t(i18nKeys.passwordReset.reset.error.weakPassword));
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError(t(i18nKeys.passwordReset.reset.error.invalidToken));
      return;
    }

    if (!validateLocally()) {
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.NODE_ENV !== 'production') {
        headers['x-payflow-bypass-ratelimit'] = '1';
      }

      const response = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      if (!response.ok) {
        let code: string | undefined;
        try {
          const data = (await response.json()) as { code?: string };
          code = data.code;
        } catch {
          // ignore body parse errors
        }

        if (code === 'weak_password') {
          setError(t(i18nKeys.passwordReset.reset.error.weakPassword));
        } else if (code === 'invalid_token') {
          setError(t(i18nKeys.passwordReset.reset.error.invalidToken));
        } else if (code === 'reset_token_expired') {
          setError(t(i18nKeys.passwordReset.reset.error.expiredToken));
        } else if (code === 'reset_token_used') {
          setError(t(i18nKeys.passwordReset.reset.error.usedToken));
        } else {
          setError(t(i18nKeys.passwordReset.reset.error.generic));
        }
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError(t(i18nKeys.passwordReset.reset.error.connection));
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToLogin() {
    const base = locale || 'pt-BR';
    router.push(`/${base}/login`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t(i18nKeys.passwordReset.reset.title)}</CardTitle>
          <CardDescription>
            {t(i18nKeys.passwordReset.reset.description)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm text-green-800">
                {t(i18nKeys.passwordReset.reset.success)}
              </p>
              <Button onClick={handleGoToLogin} className="w-full">
                {t(i18nKeys.login.title)}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-password">{t(i18nKeys.passwordReset.reset.newPasswordLabel)}</Label>
                <Input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-password-confirm">{t(i18nKeys.passwordReset.reset.confirmPasswordLabel)}</Label>
                <Input
                  id="reset-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !token}>
                {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.passwordReset.reset.submit)}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
