'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { Copy, ExternalLink, Loader2, Receipt } from 'lucide-react';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type GuardianInvoiceListItem = {
  id: string;
  dueDate: string;
  amountCents: number;
  status: InvoiceStatus;
  student: { id: string; name: string | null } | null;
  description: string | null;
  paymentLink: string | null;
};

type GuardianInvoiceDetail = GuardianInvoiceListItem;

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type GuardianStudent = {
  id: string;
  name: string;
};

type StudentsResponse = {
  items: { id: string; name: string }[];
};

type FilterStatus = 'ALL' | InvoiceStatus;

function formatAmountBRL(amountCents: number) {
  const value = amountCents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString();
}

export default function GuardianInvoicesPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [students, setStudents] = useState<GuardianStudent[]>([]);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<GuardianInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [studentIdFilter, setStudentIdFilter] = useState('');

  // Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<GuardianInvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setStudentsError(null);
      try {
        const res = await apiFetch('/guardian/students');
        if (!res.ok) {
          if (!cancelled) {
            setStudentsError(t(i18nKeys.common.error));
          }
          return;
        }

        const data = (await res.json()) as StudentsResponse;
        if (!cancelled) {
          setStudents(
            (data.items ?? []).map((item) => ({
              id: item.id,
              name: item.name,
            }))
          );
        }
      } catch {
        if (!cancelled) {
          setStudentsError(t(i18nKeys.common.error));
        }
      }
    }

    void loadStudents();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, t]);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (studentIdFilter) params.set('studentId', studentIdFilter);

      const res = await apiFetch(`/guardian/invoices?${params.toString()}`);
      if (!res.ok) {
        setError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
        setInvoices([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<GuardianInvoiceListItem>;
      setInvoices(data.items);
    } catch {
      setError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, fromDate, statusFilter, studentIdFilter, t, toDate]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(event.target.value as FilterStatus);
  }

  function handleStudentChange(event: ChangeEvent<HTMLSelectElement>) {
    setStudentIdFilter(event.target.value);
  }

  function statusLabel(status: InvoiceStatus): string {
    switch (status) {
      case 'DRAFT':
        return t(i18nKeys.guardian.invoicesUi.status.draft);
      case 'PENDING':
        return t(i18nKeys.guardian.invoicesUi.status.pending);
      case 'PAID':
        return t(i18nKeys.guardian.invoicesUi.status.paid);
      case 'OVERDUE':
        return t(i18nKeys.guardian.invoicesUi.status.overdue);
      case 'CANCELED':
        return t(i18nKeys.guardian.invoicesUi.status.canceled);
      case 'REFUNDED':
        return t(i18nKeys.guardian.invoicesUi.status.refunded);
      default:
        return status;
    }
  }

  function getStatusBadgeVariant(
    status: InvoiceStatus
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'OVERDUE':
        return 'destructive';
      case 'PENDING':
        return 'outline';
      case 'CANCELED':
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'default';
    }
  }

  async function openInvoiceDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedInvoice(null);
    setPaymentLink(null);
    setCopySuccess(null);
    setIsSheetOpen(true);

    try {
      const res = await apiFetch(`/guardian/invoices/${id}`);
      if (!res.ok) {
        setDetailError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
        return;
      }

      const data = (await res.json()) as { invoice: GuardianInvoiceDetail };
      setSelectedInvoice(data.invoice);
    } catch {
      setDetailError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
    } finally {
      setDetailLoading(false);
    }
  }

  async function generatePaymentLink(): Promise<string | null> {
    if (!selectedInvoice || paymentLoading) return null;

    setPaymentLoading(true);
    setDetailError(null);
    try {
      const res = await apiFetch(`/guardian/invoices/${selectedInvoice.id}/payment-link`, {
        method: 'POST',
      });
      if (!res.ok) {
        setDetailError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
        return null;
      }
      const data = (await res.json()) as { paymentLink: string; provider: string };
      setPaymentLink(data.paymentLink);
      return data.paymentLink;
    } catch {
      setDetailError(t(i18nKeys.guardian.invoicesUi.feedback.loadError));
      return null;
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleCopyPaymentLink() {
    if (!selectedInvoice) return;

    let link = paymentLink;
    if (!link) {
      link = await generatePaymentLink();
      if (!link) return;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopySuccess(t(i18nKeys.guardian.invoicesUi.detail.copyPaymentLinkSuccess));
      setTimeout(() => setCopySuccess(null), 3000);
    } catch {
      setCopySuccess(null);
    }
  }

  async function handleOpenPaymentPage() {
    if (!selectedInvoice) return;

    let link = paymentLink;
    if (!link) {
      link = await generatePaymentLink();
      if (!link) return;
    }

    if (typeof window !== 'undefined') {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(i18nKeys.guardian.pages.invoices.title)}
        </h1>
        <p className="text-muted-foreground">{t(i18nKeys.guardian.pages.invoices.description)}</p>
      </div>

      <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card sm:flex-row sm:items-end">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t(i18nKeys.guardian.invoicesUi.filters.status)}
          </Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="ALL">{t(i18nKeys.guardian.invoicesUi.filters.statusAll)}</option>
            <option value="PENDING">{t(i18nKeys.guardian.invoicesUi.status.pending)}</option>
            <option value="OVERDUE">{t(i18nKeys.guardian.invoicesUi.status.overdue)}</option>
            <option value="PAID">{t(i18nKeys.guardian.invoicesUi.status.paid)}</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t(i18nKeys.guardian.invoicesUi.filters.from)}
          </Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t(i18nKeys.guardian.invoicesUi.filters.to)}
          </Label>
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>

        <div className="space-y-2 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">
            {t(i18nKeys.guardian.invoicesUi.filters.student)}
          </Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={studentIdFilter}
            onChange={handleStudentChange}
          >
            <option value="">{t(i18nKeys.guardian.invoicesUi.filters.statusAll)}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {studentsError && <div className="text-sm text-destructive">{studentsError}</div>}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex justify-center p-8 text-destructive">{error}</div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <Receipt className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <p>{t(i18nKeys.guardian.invoicesUi.empty)}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(i18nKeys.guardian.invoicesUi.table.dueDate)}</TableHead>
                  <TableHead>{t(i18nKeys.guardian.invoicesUi.table.student)}</TableHead>
                  <TableHead>{t(i18nKeys.guardian.invoicesUi.table.amount)}</TableHead>
                  <TableHead>{t(i18nKeys.guardian.invoicesUi.table.status)}</TableHead>
                  <TableHead className="text-right">
                    {t(i18nKeys.guardian.invoicesUi.table.actions)}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>{invoice.student?.name ?? '-'}</TableCell>
                    <TableCell>{formatAmountBRL(invoice.amountCents)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {statusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void openInvoiceDetail(invoice.id)}
                      >
                        {t(i18nKeys.school.guardiansUi.actions.viewDetails)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t(i18nKeys.guardian.invoicesUi.detail.title)}</SheetTitle>
            <SheetDescription>{t(i18nKeys.guardian.invoicesUi.detail.infoTitle)}</SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            {detailLoading ? (
              <div className="flex justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : detailError ? (
              <div className="text-destructive text-sm">{detailError}</div>
            ) : selectedInvoice ? (
              <>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Valor e Vencimento</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        {formatAmountBRL(selectedInvoice.amountCents)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Vence em {formatDate(selectedInvoice.dueDate)}
                    </span>
                  </div>

                  <div className="rounded-lg border p-3 bg-muted/30">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      Status
                    </span>
                    <div className="mt-1">
                      <Badge variant={getStatusBadgeVariant(selectedInvoice.status)}>
                        {statusLabel(selectedInvoice.status)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Aluno</span>
                    <p className="text-base">{selectedInvoice.student?.name ?? '-'}</p>
                  </div>

                  {selectedInvoice.description && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Descrição</span>
                      <p className="text-sm">{selectedInvoice.description}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <h4 className="text-sm font-medium leading-none">Pagamento</h4>

                  {selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'OVERDUE' ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => void handleOpenPaymentPage()}
                        disabled={paymentLoading}
                        className="w-full"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t(i18nKeys.guardian.invoicesUi.detail.openPaymentPage)}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleCopyPaymentLink()}
                        disabled={paymentLoading}
                        className="w-full"
                      >
                        {copySuccess ? (
                          <span className="text-green-600">{copySuccess}</span>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            {t(i18nKeys.guardian.invoicesUi.detail.copyPaymentLink)}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Esta fatura não está pendente de pagamento.
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
