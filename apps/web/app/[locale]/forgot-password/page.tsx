'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth-layout';

export default function ForgotPasswordPage() {
  const { t, locale } = useI18n();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateLocally(): boolean {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isEmailValid(trimmedEmail)) {
      setError(t(i18nKeys.passwordReset.forgot.error.validation));
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

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

      const response = await fetch(`${getApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        try {
          const data = (await response.json()) as { code?: string };

          if (data.code === 'rate_limit_exceeded') {
            setSuccess(true);
            return;
          }

          if (data.code === 'validation_error') {
            setError(t(i18nKeys.passwordReset.forgot.error.validation));
          } else {
            setError(t(i18nKeys.passwordReset.forgot.error.generic));
          }
        } catch {
          setError(t(i18nKeys.passwordReset.forgot.error.generic));
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t(i18nKeys.passwordReset.forgot.error.connection));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t(i18nKeys.passwordReset.forgot.title)}
      description={t(i18nKeys.passwordReset.forgot.description)}
    >
      <Card>
        <CardContent className="pt-6">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm text-green-800">
                {t(i18nKeys.passwordReset.forgot.success)}
              </p>
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
                <Label htmlFor="forgot-email">{t(i18nKeys.passwordReset.forgot.emailLabel)}</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t(i18nKeys.passwordReset.forgot.emailPlaceholder)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.passwordReset.forgot.submit)}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t p-6">
          <Link
            href={`/${locale}/login`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(i18nKeys.passwordReset.forgot.backToLogin)}
          </Link>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}
