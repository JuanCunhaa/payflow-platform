'use client';

import type { MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  ShieldAlert,
  User,
  X,
} from 'lucide-react';

type GuardianStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

type PendingGuardian = {
  id: string;
  name: string;
  phone: string;
  user: {
    email: string;
    emailVerified: boolean;
    status: GuardianStatus;
  };
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function SchoolGuardiansApprovalsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [guardians, setGuardians] = useState<PendingGuardian[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [actionGuardianId, setActionGuardianId] = useState<string | null>(null);

  const loadPendingGuardians = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await apiFetch(`/school/guardians/pending?${params.toString()}`);
      if (!res.ok) {
        setError(t(i18nKeys.school.guardiansUi.feedback.loadError));
        setGuardians([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<PendingGuardian>;
      setGuardians(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.loadError));
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, pageSize, t]);

  useEffect(() => {
    void loadPendingGuardians();
  }, [loadPendingGuardians]);

  async function handleApprove(id: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setActionGuardianId(id);
    setError(null);

    try {
      const res = await apiFetch(`/school/guardians/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'email_not_verified') {
          setError('O e-mail do responsável ainda não foi verificado.');
        } else {
          setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
        }
        return;
      }
      await loadPendingGuardians();
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    } finally {
      setActionGuardianId(null);
    }
  }

  async function handleReject(id: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setActionGuardianId(id);
    setError(null);

    try {
      const res = await apiFetch(`/school/guardians/${id}/reject`, {
        method: 'POST',
      });
      if (!res.ok) {
        setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
        return;
      }
      await loadPendingGuardians();
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    } finally {
      setActionGuardianId(null);
    }
  }

  function handlePrevPage() {
    if (page > 1) {
      setPage(page - 1);
    }
  }

  function handleNextPage() {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(i18nKeys.school.pages.approvalsGuardians.title)}
        </h1>
        <p className="text-muted-foreground">
          {t(i18nKeys.school.pages.approvalsGuardians.description)}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t(i18nKeys.school.pages.approvalsGuardians.title)}</CardTitle>
          <CardDescription>
            {t(i18nKeys.school.pages.approvalsGuardians.description)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground">
              {t(i18nKeys.common.loading)}
            </div>
          ) : guardians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p>{t(i18nKeys.school.guardiansUi.empty)}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t(i18nKeys.school.guardiansUi.table.name)}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t(i18nKeys.school.guardiansUi.table.email)}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        {t(i18nKeys.school.guardiansUi.table.phone)}
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                        {t(i18nKeys.school.guardiansUi.table.actions)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {guardians.map((guardian) => (
                      <tr
                        key={guardian.id}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{guardian.name}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{guardian.user.email}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{guardian.phone}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {guardian.user.emailVerified ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-800 dark:text-green-100">
                              Verificado
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                              Pendente
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                              onClick={(e) => void handleApprove(guardian.id, e)}
                              disabled={
                                actionGuardianId === guardian.id || !guardian.user.emailVerified
                              }
                              title={
                                !guardian.user.emailVerified
                                  ? 'Email deve ser verificado antes da aprovação'
                                  : 'Aprovar'
                              }
                            >
                              <Check className="h-4 w-4" />
                              <span className="sr-only">
                                {t(i18nKeys.school.guardiansUi.actions.activate)}
                              </span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={(e) => void handleReject(guardian.id, e)}
                              disabled={actionGuardianId === guardian.id}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">
                                {t(i18nKeys.school.guardiansUi.actions.inactivate)}
                              </span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t px-4 py-4">
                <div className="text-sm text-muted-foreground">
                  {page} de {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevPage}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextPage}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
