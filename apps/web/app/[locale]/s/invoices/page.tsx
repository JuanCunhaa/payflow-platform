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
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      <section
        style={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px rgba(15,23,42,0.04)',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            marginTop: 0,
            marginBottom: '4px',
          }}
        >
          {t(i18nKeys.school.pages.invoices.title)}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '16px',
          }}
        >
          {t(i18nKeys.school.pages.invoices.description)}
        </p>

        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: '8px',
            marginBottom: '12px',
            fontSize: '13px',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.status)}</span>
            <select
              value={statusFilter}
              onChange={handleStatusChange}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            >
              <option value="ALL">
                {t(i18nKeys.school.invoicesUi.filters.statusAll)}
              </option>
              <option value="PENDING">
                {t(i18nKeys.school.invoicesUi.status.pending)}
              </option>
              <option value="OVERDUE">
                {t(i18nKeys.school.invoicesUi.status.overdue)}
              </option>
              <option value="PAID">
                {t(i18nKeys.school.invoicesUi.status.paid)}
              </option>
              <option value="CANCELED">
                {t(i18nKeys.school.invoicesUi.status.canceled)}
              </option>
              <option value="REFUNDED">
                {t(i18nKeys.school.invoicesUi.status.refunded)}
              </option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.from)}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.to)}</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.search)}</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.search)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.student)}</span>
            <input
              type="text"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.student)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>{t(i18nKeys.school.invoicesUi.filters.guardian)}</span>
            <input
              type="text"
              value={guardianQuery}
              onChange={(event) => setGuardianQuery(event.target.value)}
              placeholder={t(i18nKeys.school.invoicesUi.filters.guardian)}
              style={{
                padding: '6px 8px',
                borderRadius: '8px',
                border: '1px solid #cbd5f5',
              }}
            />
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="submit"
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {t(i18nKeys.common.ok)}
            </button>
          </div>
        </form>

        {error && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {t(i18nKeys.common.loading)}
          </p>
        ) : invoices.length === 0 ? (
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {t(i18nKeys.school.invoicesUi.empty)}
          </p>
        ) : (
          <>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                marginBottom: '8px',
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.dueDate)}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.student)}
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.guardian)}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.amount)}
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.origin)}
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.status)}
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px',
                      borderBottom: '1px solid #e5e7eb',
                    }}
                  >
                    {t(i18nKeys.school.invoicesUi.table.actions)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const studentName = invoice.student?.name ?? '';
                  const guardianName = invoice.guardian?.name ?? '';
                  const originLabel = invoice.contractId
                    ? t(i18nKeys.school.contractsUi.table.name)
                    : 'One-off';
                  const colors = statusBadgeColors(invoice.status);

                  return (
                    <tr key={invoice.id}>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {studentName || '-'}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        {guardianName || '-'}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        {formatAmount(invoice.amountCents, invoice.currency)}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'center',
                        }}
                      >
                        {originLabel}
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'center',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: colors.background,
                            color: colors.color,
                          }}
                        >
                          {statusLabel(invoice.status)}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #f3f4f6',
                          textAlign: 'right',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => void loadInvoiceDetail(invoice.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {t(i18nKeys.school.invoicesUi.table.actions)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '13px',
                marginTop: '4px',
              }}
            >
              <span>
                {page} / {totalPages}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={page <= 1}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= totalPages}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section
        style={{
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px rgba(15,23,42,0.04)',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            marginTop: 0,
            marginBottom: '8px',
          }}
        >
          {t(i18nKeys.school.invoicesUi.detail.title)}
        </h2>

        {detailError && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              fontSize: '14px',
            }}
          >
            {detailError}
          </div>
        )}

        {detailLoading ? (
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {t(i18nKeys.common.loading)}
          </p>
        ) : !selectedInvoice ? (
          <p
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {t(i18nKeys.school.invoicesUi.empty)}
          </p>
        ) : (
          <>
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  marginTop: 0,
                  marginBottom: '6px',
                }}
              >
                {t(i18nKeys.school.invoicesUi.detail.infoTitle)}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#0f172a',
                }}
              >
                {formatAmount(selectedInvoice.amountCents, selectedInvoice.currency)} •{' '}
                {formatDate(selectedInvoice.dueDate)} • {statusLabel(selectedInvoice.status)}
              </p>
              <p
                style={{
                  margin: 0,
                  marginTop: '4px',
                  fontSize: '13px',
                  color: '#64748b',
                }}
              >
                {selectedInvoice.student?.name ?? '-'} •{' '}
                {selectedInvoice.guardian?.name ?? selectedInvoice.guardian?.user?.email ?? '-'}
              </p>
              <p
                style={{
                  margin: 0,
                  marginTop: '4px',
                  fontSize: '13px',
                  color: '#9ca3af',
                }}
              >
                {selectedOrigin === 'contract' ? 'Mensalidade (contrato)' : 'Cobrança avulsa'}
              </p>
            </div>

            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  marginTop: 0,
                  marginBottom: '6px',
                }}
              >
                {t(i18nKeys.school.invoicesUi.detail.paymentLinkLabel)}
              </h3>
              {selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'OVERDUE' ? (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  {paymentLink ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void handleCopyPaymentLink()}
                        disabled={paymentLoading}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        {t(i18nKeys.school.invoicesUi.detail.copyPaymentLink)}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleOpenPaymentPage()}
                        disabled={paymentLoading}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: 'none',
                          backgroundColor: '#4f46e5',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        {t(i18nKeys.school.invoicesUi.detail.openPaymentPage)}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void generatePaymentLink()}
                      disabled={paymentLoading}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '999px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {paymentLoading
                        ? t(i18nKeys.common.loading)
                        : t(i18nKeys.school.invoicesUi.detail.generatePaymentLink)}
                    </button>
                  )}
                </div>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#64748b',
                  }}
                >
                  {statusLabel(selectedInvoice.status)}
                </p>
              )}
              {copySuccess && (
                <p
                  style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#16a34a',
                  }}
                >
                  {copySuccess}
                </p>
              )}
              {paymentError && (
                <p
                  style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#b91c1c',
                  }}
                >
                  {paymentError}
                </p>
              )}
            </div>

            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  marginTop: 0,
                  marginBottom: '6px',
                }}
              >
                {t(i18nKeys.school.invoicesUi.detail.statusTimelineTitle)}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#9ca3af',
                  margin: 0,
                }}
              >
                {/* Placeholder simples de timeline */}
                {statusLabel(selectedInvoice.status)} •{' '}
                {new Date(selectedInvoice.createdAt).toLocaleString()}
              </p>
            </div>

            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
              <div>
                <h3
                  style={{
                    fontSize: '16px',
                    marginTop: 0,
                    marginBottom: '6px',
                  }}
                >
                  {t(i18nKeys.school.invoicesUi.detail.itemsTitle)}
                </h3>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {selectedInvoice.items.map((item) => (
                    <li
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6',
                        fontSize: '13px',
                      }}
                    >
                      <span>{item.description}</span>
                      <span>
                        {formatAmount(item.amountCents, selectedInvoice.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div
              style={{
                marginTop: '12px',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  marginTop: 0,
                  marginBottom: '6px',
                }}
              >
                {t(i18nKeys.school.invoicesUi.detail.communicationsTitle)}
              </h3>
              {!selectedInvoice.communications ||
              selectedInvoice.communications.length === 0 ? (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#9ca3af',
                    margin: 0,
                  }}
                >
                  {t(i18nKeys.school.invoicesUi.detail.communicationsEmpty)}
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: '13px',
                    color: '#4b5563',
                  }}
                >
                  {selectedInvoice.communications.map((comm) => (
                    <li
                      key={comm.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6',
                      }}
                    >
                      <span>{communicationLabel(comm.type)}</span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#9ca3af',
                        }}
                      >
                        {new Date(comm.sentAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
