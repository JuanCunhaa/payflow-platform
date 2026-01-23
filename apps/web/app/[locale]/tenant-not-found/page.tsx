'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function TenantNotFoundLocalized() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-destructive">{t(i18nKeys.tenant.notFound.title)}</CardTitle>
          <CardDescription className="pt-2">
            {t(i18nKeys.tenant.notFound.description)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t(i18nKeys.tenant.notFound.extra)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
