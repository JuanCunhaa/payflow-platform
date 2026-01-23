'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default function PendingApprovalPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center">
          <div className="rounded-full bg-yellow-100 p-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle>{t(i18nKeys.auth.pendingApproval.title)}</CardTitle>
          <CardDescription className="pt-2">
            {t(i18nKeys.auth.pendingApproval.description)}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
