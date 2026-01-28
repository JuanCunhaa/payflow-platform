'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { i18nKeys } from '@payflow/shared';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type StudentReportInvoice = {
  id: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  contractName: string | null;
  guardianName: string | null;
};

type StudentReportResponse = {
  student: {
    id: string;
    name: string | null;
  };
  totals: {
    totalPaidCents: number;
    totalOpenCents: number;
  };
  invoices: StudentReportInvoice[];
};

function formatAmountBRL(amountCents: number): string {
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

function formatDate(dateIso: string | null): string {
  if (!dateIso) return '—';
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString();
}

export default function StudentFinancialReportPage() {
  const params = useParams<{ id: string; locale: string }>();
  const studentId = params?.id as string;

  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [report, setReport] = useState<StudentReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch(`/school/reports/student/${studentId}`);
        if (!res.ok) {
          if (!cancelled) {
            setError(t(i18nKeys.school.reportsUi.student.feedback.loadError));
            setReport(null);
          }
          return;
        }

        const data = (await res.json()) as StudentReportResponse;
        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.school.reportsUi.student.feedback.loadError));
          setReport(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, studentId, t]);

  function statusLabel(status: InvoiceStatus): string {
    switch (status) {
      case 'DRAFT':
        return t(i18nKeys.school.invoicesUi.status.draft);
      case 'PENDING':
        return t(i18nKeys.school.invoicesUi.status.pending);
      case 'PAID':
        return t(i18nKeys.school.invoicesUi.status.paid);
      case 'OVERDUE':
        return t(i18nKeys.school.invoicesUi.status.overdue);
      case 'CANCELED':
        return t(i18nKeys.school.invoicesUi.status.canceled);
      case 'REFUNDED':
        return t(i18nKeys.school.invoicesUi.status.refunded);
      default:
        return status;
    }
  }

  function getStatusBadgeVariant(status: InvoiceStatus) {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'OVERDUE':
        return 'destructive';
      case 'PENDING':
        return 'warning';
      case 'CANCELED':
        return 'secondary';
      default:
        return 'outline';
    }
  }

  const baseLocale = locale || 'pt-BR';
  const studentsListHref = `/${baseLocale}/s/students`;

  const totalPaid = report?.totals.totalPaidCents ?? 0;
  const totalOpen = report?.totals.totalOpenCents ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={studentsListHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-col">
          <h1 className="text-xl font-semibold tracking-tight">
            {t(i18nKeys.school.reportsUi.student.title)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(i18nKeys.school.reportsUi.student.description)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{report?.student.name ?? '...'}</CardTitle>
          <CardDescription>{t(i18nKeys.school.reportsUi.student.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground">
                    {t(i18nKeys.school.reportsUi.student.cards.totalPaid)}
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatAmountBRL(totalPaid)}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground">
                    {t(i18nKeys.school.reportsUi.student.cards.totalOpen)}
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatAmountBRL(totalOpen)}
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.dueDate)}</TableHead>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.amount)}</TableHead>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.status)}</TableHead>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.guardian)}</TableHead>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.contract)}</TableHead>
                      <TableHead>{t(i18nKeys.school.reportsUi.student.table.paidAt)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!report?.invoices.length ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {t(i18nKeys.school.reportsUi.student.empty)}
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell>{formatAmountBRL(invoice.amountCents)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(invoice.status)}>
                              {statusLabel(invoice.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{invoice.guardianName ?? '—'}</TableCell>
                          <TableCell>{invoice.contractName ?? '—'}</TableCell>
                          <TableCell>{formatDate(invoice.paidAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
