'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

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

  const [selectedInvoice, setSelectedInvoice] = useState<GuardianInvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Carrega alunos vinculados para filtro
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

  async function openInvoiceDetail(id: string) {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedInvoice(null);
    setPaymentLink(null);
    setCopySuccess(null);

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
    <section
      style={{
        maxWidth: '960px',
        margin: '0 auto',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: '8px',
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {t(i18nKeys.guardian.pages.invoices.title)}
      </h1>
      <p
        style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        {t(i18nKeys.guardian.pages.invoices.description)}
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          fontSize: '13px',
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              color: '#4b5563',
            }}
          >
            {t(i18nKeys.guardian.invoicesUi.filters.status)}
          </span>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <option value="ALL">{t(i18nKeys.guardian.invoicesUi.filters.statusAll)}</option>
            <option value="PENDING">{t(i18nKeys.guardian.invoicesUi.status.pending)}</option>
            <option value="OVERDUE">{t(i18nKeys.guardian.invoicesUi.status.overdue)}</option>
            <option value="PAID">{t(i18nKeys.guardian.invoicesUi.status.paid)}</option>
          </select>
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              color: '#4b5563',
            }}
          >
            {t(i18nKeys.guardian.invoicesUi.filters.from)}
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              color: '#4b5563',
            }}
          >
            {t(i18nKeys.guardian.invoicesUi.filters.to)}
          </span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          />
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '180px',
          }}
        >
          <span
            style={{
              color: '#4b5563',
            }}
          >
            {t(i18nKeys.guardian.invoicesUi.filters.student)}
          </span>
          <select
            value={studentIdFilter}
            onChange={handleStudentChange}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <option value="">{t(i18nKeys.guardian.invoicesUi.filters.statusAll)}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {studentsError && (
        <p
          style={{
            marginTop: 0,
            marginBottom: '12px',
            fontSize: '13px',
            color: '#b91c1c',
          }}
        >
          {studentsError}
        </p>
      )}

      {loading ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.common.loading)}
        </p>
      ) : error ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#b91c1c',
          }}
        >
          {error}
        </p>
      ) : invoices.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.guardian.invoicesUi.empty)}
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.guardian.invoicesUi.table.dueDate)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.guardian.invoicesUi.table.student)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.guardian.invoicesUi.table.amount)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.guardian.invoicesUi.table.status)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.guardian.invoicesUi.table.actions)}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const badgeColors = statusBadgeColors(invoice.status);
              return (
                <tr key={invoice.id}>
                  <td
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {formatDate(invoice.dueDate)}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {invoice.student?.name ?? '-'}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {formatAmountBRL(invoice.amountCents)}
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        backgroundColor: badgeColors.background,
                        color: badgeColors.color,
                      }}
                    >
                      {statusLabel(invoice.status)}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => void openInvoiceDetail(invoice.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '999px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {t(i18nKeys.school.guardiansUi.actions.viewDetails)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {(detailLoading || selectedInvoice || detailError) && (
        <div
          style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            {t(i18nKeys.guardian.invoicesUi.detail.title)}
          </h2>

          {detailLoading && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.common.loading)}
            </p>
          )}

          {detailError && !detailLoading && (
            <p
              style={{
                margin: 0,
                fontSize: '14px',
                color: '#b91c1c',
              }}
            >
              {detailError}
            </p>
          )}

          {selectedInvoice && !detailLoading && !detailError && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <div>
                <strong>{t(i18nKeys.guardian.invoicesUi.detail.infoTitle)}</strong>
                <p
                  style={{
                    margin: '4px 0',
                    color: '#0f172a',
                  }}
                >
                  {formatAmountBRL(selectedInvoice.amountCents)} •{' '}
                  {formatDate(selectedInvoice.dueDate)} • {statusLabel(selectedInvoice.status)}
                </p>
                <p
                  style={{
                    margin: '4px 0',
                    color: '#64748b',
                  }}
                >
                  {selectedInvoice.student?.name ?? '-'}
                </p>
                {selectedInvoice.description && (
                  <p
                    style={{
                      margin: '4px 0',
                      color: '#64748b',
                    }}
                  >
                    {selectedInvoice.description}
                  </p>
                )}
              </div>

              <div>
                <strong>{t(i18nKeys.guardian.invoicesUi.detail.statusTimelineTitle)}</strong>
                <p
                  style={{
                    margin: '4px 0',
                    color: '#9ca3af',
                    fontSize: '13px',
                  }}
                >
                  {statusLabel(selectedInvoice.status)} • {formatDate(selectedInvoice.dueDate)}
                </p>
              </div>

              <div
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#64748b',
                  }}
                >
                  {t(i18nKeys.guardian.invoicesUi.detail.paymentLinkLabel)}
                </p>

                {selectedInvoice.status === 'PENDING' || selectedInvoice.status === 'OVERDUE' ? (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
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
                          {t(i18nKeys.guardian.invoicesUi.detail.copyPaymentLink)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleOpenPaymentPage()}
                          disabled={paymentLoading}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor: '#22c55e',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '13px',
                          }}
                        >
                          {t(i18nKeys.guardian.invoicesUi.detail.openPaymentPage)}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void generatePaymentLink()}
                        disabled={paymentLoading}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '999px',
                          border: 'none',
                          backgroundColor: '#22c55e',
                          color: '#ffffff',
                          cursor: 'pointer',
                          fontSize: '13px',
                        }}
                      >
                        {paymentLoading
                          ? t(i18nKeys.common.loading)
                          : t(i18nKeys.guardian.invoicesUi.detail.generatePaymentLink)}
                      </button>
                    )}
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: '13px',
                      color: '#16a34a',
                    }}
                  >
                    {t(i18nKeys.guardian.invoicesUi.detail.paidLabel)}
                  </span>
                )}
              </div>

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
            </div>
          )}
        </div>
      )}
    </section>
  );
}
