'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useI18n } from '../../../i18n-context';
import { getApiBase } from '../../../api-base';
import { i18nKeys } from '@payflow/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorDetails(t(i18nKeys.passwordReset.reset.error.invalidToken));
      return;
    }

    async function verify() {
      try {
        const response = await fetch(`${getApiBase()}/public/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data.code === 'token_expired') {
            setErrorDetails(t(i18nKeys.passwordReset.reset.error.expiredToken));
          } else if (data.code === 'invalid_token') {
            setErrorDetails(t(i18nKeys.passwordReset.reset.error.invalidToken));
          } else {
            setErrorDetails(t(i18nKeys.passwordReset.reset.error.generic));
          }
          setStatus('error');
          return;
        }

        setStatus('success');
      } catch (err) {
        setStatus('error');
        setErrorDetails(t(i18nKeys.passwordReset.reset.error.connection));
      }
    }

    verify();
  }, [searchParams, t]);

  function handleGoToLogin() {
    router.push(`/${locale || 'pt-BR'}/login`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Verificação de E-mail</CardTitle>
          <CardDescription className="text-center">
            {status === 'loading' && 'Verificando seu e-mail...'}
            {status === 'success' && 'E-mail verificado com sucesso!'}
            {status === 'error' && 'Falha na verificação.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <p className="text-center text-muted-foreground">
                Sua conta foi verificada. Você já pode acessar o sistema após a aprovação da escola.
              </p>
              <Button onClick={handleGoToLogin} className="w-full">
                {t(i18nKeys.login.title)}
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <p className="text-center text-red-600 font-medium">
                {errorDetails || 'Ocorreu um erro desconhecido.'}
              </p>
              <Button onClick={handleGoToLogin} variant="outline" className="w-full">
                Voltar para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
