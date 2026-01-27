'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type Invoice = {
  id: string;
  tenantId: string;
  contractId: string | null;
  guardianId: string | null;
  studentId: string | null;
  amountCents: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  provider: string;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  contract?: { id: string; name: string | null };
  student?: { id: string; name: string | null };
  guardian?: { id: string; name: string | null; user?: { email: string | null } };
  receiptUrl: string | null;
};

type InvoiceItem = {
  id: string;
  description: string;
  amountCents: number;
};

type InvoiceCommunication = {
  id: string;
  type: 'CREATED' | 'OVERDUE' | 'PAID';
  sentAt: string;
};

type InvoiceDetail = Invoice & {
  items: InvoiceItem[];
  communications?: InvoiceCommunication[];
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FilterStatus = 'ALL' | InvoiceStatus;

function formatAmount(amountCents: number, currency: string) {
  const value = amountCents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
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

export default function SchoolInvoicesPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [guardianQuery, setGuardianQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState('');
  const [exportToDate, setExportToDate] = useState('');
  const [exportStatus, setExportStatus] = useState<FilterStatus>('ALL');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const student = studentQuery.trim();
      const guardian = guardianQuery.trim();
      const q = searchQuery.trim();

      if (student) {
        params.set('studentId', student);
      }

      if (guardian) {
        params.set('guardianId', guardian);
      }

      if (q) {
        params.set('q', q);
      }

      const res = await apiFetch(`/school/invoices?${params.toString()}`);
      if (!res.ok) {
        setError(t(i18nKeys.school.invoicesUi.feedback.loadError));
        setInvoices([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<Invoice>;
      setInvoices(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch {
      setError(t(i18nKeys.school.invoicesUi.feedback.loadError));
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [
    apiFetch,
    page,
    pageSize,
    statusFilter,
    fromDate,
    toDate,
    studentQuery,
    guardianQuery,
    searchQuery,
    t,
  ]);

  useEffect(() => {
    void loadInvoices();
  }, [loadInvoices]);

  async function loadInvoiceDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedInvoice(null);
    setCopySuccess(null);
    setPaymentLink(null);
    setPaymentError(null);

    try {
      const res = await apiFetch(`/school/invoices/${id}`);
      if (!res.ok) {
        setDetailError(t(i18nKeys.school.invoicesUi.feedback.loadError));
        return;
      }
      const data = (await res.json()) as { invoice: InvoiceDetail };
      setSelectedInvoice(data.invoice);
    } catch {
      setDetailError(t(i18nKeys.school.invoicesUi.feedback.loadError));
    } finally {
      setDetailLoading(false);
    }
  }

  function handleStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setStatusFilter(event.target.value as FilterStatus);
    setPage(1);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    void loadInvoices();
  }

  function handlePrevPage() {
    if (page <= 1) return;
    setPage((current) => current - 1);
  }

  function handleNextPage() {
    if (page >= totalPages) return;
    setPage((current) => current + 1);
  }

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

  function communicationLabel(type: InvoiceCommunication['type']): string {
    switch (type) {
      case 'CREATED':
        return t(i18nKeys.school.invoicesUi.detail.communicationTypeCreated);
      case 'OVERDUE':
        return t(i18nKeys.school.invoicesUi.detail.communicationTypeOverdue);
      case 'PAID':
        return t(i18nKeys.school.invoicesUi.detail.communicationTypePaid);
      default:
        return type;
    }
  }

  function statusBadgeColors(status: InvoiceStatus): { background: string; color: string } {
    switch (status) {
      case 'PAID':
        return { background: '#dcfce7', color: '#15803d' };
      case 'OVERDUE':
        return { background: '#fee2e2', color: '#b91c1c' };
      case 'PENDING':
        return { background: '#fef9c3', color: '#a16207' };
      case 'CANCELED':
      case 'REFUNDED':
        return { background: '#e5e7eb', color: '#4b5563' };
      case 'DRAFT':
      default:
        return { background: '#e0f2fe', color: '#0369a1' };
    }
  }

  const selectedOrigin = useMemo(() => {
    if (!selectedInvoice) return '';
    if (selectedInvoice.contractId) {
      return 'contract';
    }
    return 'one_off';
  }, [selectedInvoice]);

  async function generatePaymentLink(): Promise<string | null> {
    if (!selectedInvoice || paymentLoading) return null;

    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const res = await apiFetch(`/school/invoices/${selectedInvoice.id}/payment-link`, {
        method: 'POST',
      });
      if (!res.ok) {
        setPaymentError(t(i18nKeys.school.invoicesUi.feedback.loadError));
        return null;
      }
      const data = (await res.json()) as { paymentLink: string; provider: string };
      setPaymentLink(data.paymentLink);
      return data.paymentLink;
    } catch {
      setPaymentError(t(i18nKeys.school.invoicesUi.feedback.loadError));
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
      setCopySuccess(t(i18nKeys.school.invoicesUi.detail.copyPaymentLinkSuccess));
      setTimeout(() => {
        setCopySuccess(null);
      }, 3000);
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 items-start">
      <div className="lg:col-span-3 rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-1 mt-0 text-xl font-semibold">
          {t(i18nKeys.school.pages.invoices.title)}
        </h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {t(i18nKeys.school.pages.invoices.description)}
        </p>

        <form
          onSubmit={handleSearchSubmit}
          className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.status)}</span>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              className="rounded-lg border bg-background px-2 py-1.5"
            >
              <option value="ALL">{t(i18nKeys.school.invoicesUi.filters.statusAll)}</option>
              <option value="PENDING">{t(i18nKeys.school.invoicesUi.status.pending)}</option>
              <option value="OVERDUE">{t(i18nKeys.school.invoicesUi.status.overdue)}</option>
              <option value="PAID">{t(i18nKeys.school.invoicesUi.status.paid)}</option>
              <option value="CANCELED">{t(i18nKeys.school.invoicesUi.status.canceled)}</option>
              <option value="REFUNDED">{t(i18nKeys.school.invoicesUi.status.refunded)}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.from)}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-lg border bg-background px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.to)}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-lg border bg-background px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.search)}</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.search)}
              className="rounded-lg border bg-background px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.student)}</span>
            <input
              type="text"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.student)}
              className="rounded-lg border bg-background px-2 py-1.5"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span>{t(i18nKeys.school.invoicesUi.filters.guardian)}</span>
            <input
              type="text"
              value={guardianQuery}
              onChange={(event) => setGuardianQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.guardian)}
              className="rounded-lg border bg-background px-2 py-1.5"
            />
          </label>

          <div className="col-span-1 flex items-end justify-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="submit"
              className="cursor-pointer rounded-full border-none bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
            >
              {t(i18nKeys.common.ok)}
            </button>
            <button
              type="button"
              onClick={() => {
                setExportFromDate(fromDate);
                setExportToDate(toDate);
                setExportStatus(statusFilter);
                setExportError(null);
                setExportModalOpen(true);
              }}
              className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-muted"
            >
              {t(i18nKeys.school.invoicesUi.export.button)}
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.school.invoicesUi.empty)}</p>
        ) : (
          <>
            <div className="mb-2 overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t(i18nKeys.school.invoicesUi.table.dueDate)}</th>
                    <th className="px-4 py-3 font-medium">{t(i18nKeys.school.invoicesUi.table.student)}</th>
                    <th className="px-4 py-3 font-medium">{t(i18nKeys.school.invoicesUi.table.guardian)}</th>
                    <th className="px-4 py-3 font-medium text-right">{t(i18nKeys.school.invoicesUi.table.amount)}</th>
                    <th className="px-4 py-3 font-medium text-center">{t(i18nKeys.school.invoicesUi.table.origin)}</th>
                    <th className="px-4 py-3 font-medium text-center">{t(i18nKeys.school.invoicesUi.table.status)}</th>
                    <th className="px-4 py-3 font-medium text-right">{t(i18nKeys.school.invoicesUi.table.actions)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((invoice) => {
                    const studentName = invoice.student?.name ?? '';
                    const guardianName = invoice.guardian?.name ?? '';
                    const originLabel = invoice.contractId
                      ? t(i18nKeys.school.contractsUi.table.name)
                      : 'One-off';

                    const statusColorClass =
                      invoice.status === 'PAID' ? 'bg-green-500/10 text-green-700' :
                        invoice.status === 'OVERDUE' ? 'bg-red-500/10 text-red-700' :
                          invoice.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-700' :
                            (invoice.status === 'CANCELED' || invoice.status === 'REFUNDED') ? 'bg-gray-500/10 text-gray-700' :
                              'bg-blue-500/10 text-blue-700';

                    return (
                      <tr key={invoice.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3">{studentName || '-'}</td>
                        <td className="px-4 py-3">{guardianName || '-'}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatAmount(invoice.amountCents, invoice.currency)}</td>
                        <td className="px-4 py-3 text-center text-xs">{originLabel}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColorClass}`}>
                            {statusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void loadInvoiceDetail(invoice.id)}
                            className="cursor-pointer rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
                          >
                            {t(i18nKeys.school.invoicesUi.table.actions)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  className="cursor-pointer rounded-lg border bg-background px-4 py-2 text-sm disabled:opacity-50"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  className="cursor-pointer rounded-lg border bg-background px-4 py-2 text-sm disabled:opacity-50"
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 mt-0 text-lg font-semibold">
          {t(i18nKeys.school.invoicesUi.detail.title)}
        </h2>

        {detailLoading ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
        ) : detailError ? (
          <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {detailError}
          </p>
        ) : !selectedInvoice ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.school.invoicesUi.detail.emptySelection)}</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="rounded-lg bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {t(i18nKeys.school.invoicesUi.table.amount)}
                </span>
                <span className="text-lg font-bold">
                  {formatAmount(selectedInvoice.amountCents, selectedInvoice.currency)}
                </span>
              </div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(i18nKeys.school.invoicesUi.table.dueDate)}</span>
                <span>{formatDate(selectedInvoice.dueDate)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t(i18nKeys.school.invoicesUi.table.status)}</span>
                <span className="font-medium">{statusLabel(selectedInvoice.status)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-medium text-muted-foreground">
                {t(i18nKeys.school.invoicesUi.detail.infoTitle)}
              </h3>
              <p className="m-0 text-sm font-medium text-foreground">
                {formatAmount(selectedInvoice.amountCents, selectedInvoice.currency)} •{' '}
                {formatDate(selectedInvoice.dueDate)} • {statusLabel(selectedInvoice.status)}
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                {selectedInvoice.student?.name ?? '-'} •{' '}
                {selectedInvoice.guardian?.name ?? selectedInvoice.guardian?.user?.email ?? '-'}
              </p>
              <p className="m-0 text-xs text-muted-foreground/80">
                {selectedOrigin === 'contract' ? 'Mensalidade (contrato)' : 'Cobrança avulsa'}
              </p>
            </div>

            {selectedInvoice.status === 'PENDING' && (
              <div className="flex flex-col gap-3 rounded-lg border p-4">
                <h3 className="m-0 text-sm font-semibold">
                  {t(i18nKeys.school.invoicesUi.detail.paymentTitle)}
                </h3>
                {copySuccess && (
                  <p className="rounded-lg bg-green-500/10 px-3 py-2 text-xs text-green-700">
                    {copySuccess}
                  </p>
                )}
                {paymentError && (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {paymentError}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyPaymentLink()}
                    disabled={paymentLoading}
                    className="flex-1 cursor-pointer rounded-full border bg-background px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {t(i18nKeys.school.invoicesUi.detail.copyLink)}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenPaymentPage()}
                    disabled={paymentLoading}
                    className="flex-1 cursor-pointer rounded-full border-none bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {t(i18nKeys.school.invoicesUi.detail.openLink)}
                  </button>
                </div>
              </div>
            )}

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div>
                <h3 className="mb-2 mt-0 text-base font-semibold">
                  {t(i18nKeys.school.invoicesUi.detail.itemsTitle)}
                </h3>
                <ul className="m-0 list-none divide-y border-t">
                  {selectedInvoice.items.map((item) => (
                    <li key={item.id} className="flex justify-between py-2 text-sm">
                      <span>{item.description}</span>
                      <span className="font-medium">
                        {formatAmount(item.amountCents, selectedInvoice.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="mb-2 mt-0 text-base font-semibold">
                {t(i18nKeys.school.invoicesUi.detail.communicationsTitle)}
              </h3>
              {!selectedInvoice.communications || selectedInvoice.communications.length === 0 ? (
                <p className="m-0 text-sm text-muted-foreground">
                  {t(i18nKeys.school.invoicesUi.detail.communicationsEmpty)}
                </p>
              ) : (
                <ul className="m-0 list-none divide-y border-t text-sm text-muted-foreground">
                  {selectedInvoice.communications.map((comm) => (
                    <li key={comm.id} className="flex justify-between py-2">
                      <span>{communicationLabel(comm.type)}</span>
                      <span className="text-xs text-muted-foreground/70">
                        {new Date(comm.sentAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      {exportModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
            <h2 className="mb-1 mt-0 text-lg font-semibold">
              {t(i18nKeys.school.invoicesUi.export.title)}
            </h2>
            <p className="mb-4 mt-0 text-sm text-muted-foreground">
              {t(i18nKeys.school.invoicesUi.export.description)}
            </p>

            {exportError && (
              <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-2 text-sm text-destructive">
                {exportError}
              </div>
            )}

            <form
              onSubmit={async (event) => {
                event.preventDefault();
                setExportError(null);
                setExportLoading(true);

                try {
                  const params = new URLSearchParams();
                  if (exportFromDate) params.set('from', exportFromDate);
                  if (exportToDate) params.set('to', exportToDate);
                  if (exportStatus !== 'ALL') params.set('status', exportStatus);

                  const path = `/school/reports/invoices/export${params.toString() ? `?${params.toString()}` : ''}`;

                  const res = await apiFetch(path, {
                    method: 'GET',
                  });

                  if (!res.ok) {
                    setExportError(t(i18nKeys.school.invoicesUi.feedback.exportError));
                    setExportLoading(false);
                    return;
                  }

                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'invoices-export.csv';
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  window.URL.revokeObjectURL(url);

                  setExportLoading(false);
                  setExportModalOpen(false);
                } catch {
                  setExportError(t(i18nKeys.school.invoicesUi.feedback.exportError));
                  setExportLoading(false);
                }
              }}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t(i18nKeys.school.invoicesUi.export.periodFrom)}</span>
                  <input
                    type="date"
                    value={exportFromDate}
                    onChange={(event) => setExportFromDate(event.target.value)}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span>{t(i18nKeys.school.invoicesUi.export.periodTo)}</span>
                  <input
                    type="date"
                    value={exportToDate}
                    onChange={(event) => setExportToDate(event.target.value)}
                    className="rounded-lg border bg-background px-2 py-1.5"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span>{t(i18nKeys.school.invoicesUi.export.statusLabel)}</span>
                <select
                  value={exportStatus}
                  onChange={(event) => setExportStatus(event.target.value as FilterStatus)}
                  className="rounded-lg border bg-background px-2 py-1.5"
                >
                  <option value="ALL">{t(i18nKeys.school.invoicesUi.filters.statusAll)}</option>
                  <option value="PENDING">{t(i18nKeys.school.invoicesUi.status.pending)}</option>
                  <option value="OVERDUE">{t(i18nKeys.school.invoicesUi.status.overdue)}</option>
                  <option value="PAID">{t(i18nKeys.school.invoicesUi.status.paid)}</option>
                  <option value="CANCELED">{t(i18nKeys.school.invoicesUi.status.canceled)}</option>
                  <option value="REFUNDED">{t(i18nKeys.school.invoicesUi.status.refunded)}</option>
                </select>
              </label>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!exportLoading) {
                      setExportModalOpen(false);
                    }
                  }}
                  className="cursor-pointer rounded-full border bg-background px-3 py-2 text-sm hover:bg-muted"
                >
                  {t(i18nKeys.school.invoicesUi.export.cancel)}
                </button>
                <button
                  type="submit"
                  disabled={exportLoading}
                  className="cursor-pointer rounded-full border-none bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {exportLoading
                    ? t(i18nKeys.common.loading)
                    : t(i18nKeys.school.invoicesUi.export.submit)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
