'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type GuardianReportInvoice = {
  id: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  paidAt: string | null;
  contractName: string | null;
  studentName: string | null;
};

type GuardianReportResponse = {
  guardian: {
    id: string;
    name: string | null;
    email: string | null;
  };
  totals: {
    totalPaidCents: number;
    totalOpenCents: number;
  };
  invoices: GuardianReportInvoice[];
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

function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function GuardianFinancialReportPage() {
  const params = useParams<{ id: string; locale: string }>();
  const guardianId = params?.id as string;

  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [report, setReport] = useState<GuardianReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guardianId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiFetch(`/school/reports/guardian/${guardianId}`);
        if (!res.ok) {
          if (!cancelled) {
            setError(t(i18nKeys.school.reportsUi.guardian.feedback.loadError));
            setReport(null);
          }
          return;
        }

        const data = (await res.json()) as GuardianReportResponse;
        if (!cancelled) {
          setReport(data);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.school.reportsUi.guardian.feedback.loadError));
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
  }, [apiFetch, guardianId, t]);

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

  const baseLocale = locale || 'pt-BR';
  const guardiansListHref = `/${baseLocale}/s/guardians`;

  const totalPaid = report?.totals.totalPaidCents ?? 0;
  const totalOpen = report?.totals.totalOpenCents ?? 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
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
          {t(i18nKeys.school.reportsUi.guardian.title)}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            marginTop: 0,
            marginBottom: '12px',
          }}
        >
          {t(i18nKeys.school.reportsUi.guardian.description)}
        </p>
        {report?.guardian && (
          <p
            style={{
              fontSize: '14px',
              color: '#0f172a',
              margin: 0,
            }}
          >
            <strong>{report.guardian.name ?? report.guardian.email ?? '—'}</strong>
            {report.guardian.email && (
              <>
                {' '}
                <span
                  style={{
                    color: '#6b7280',
                  }}
                >
                  ({report.guardian.email})
                </span>
              </>
            )}
          </p>
        )}
        <div
          style={{
            marginTop: '12px',
          }}
        >
          <Link
            href={guardiansListHref}
            style={{
              fontSize: '13px',
              color: '#4f46e5',
              textDecoration: 'underline',
            }}
          >
            {t(i18nKeys.school.reportsUi.guardian.backToList)}
          </Link>
        </div>
      </div>

      {error && (
        <div
          style={{
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
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                backgroundColor: '#f0fdf4',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                {t(i18nKeys.school.reportsUi.guardian.cards.totalPaid)}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#166534',
                }}
              >
                {formatAmountBRL(totalPaid)}
              </div>
            </div>
            <div
              style={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '12px 16px',
                backgroundColor: '#fefce8',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  marginBottom: '4px',
                }}
              >
                {t(i18nKeys.school.reportsUi.guardian.cards.totalOpen)}
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#92400e',
                }}
              >
                {formatAmountBRL(totalOpen)}
              </div>
            </div>
          </div>

          {report && report.invoices.length === 0 ? (
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                marginTop: '16px',
              }}
            >
              {t(i18nKeys.school.reportsUi.guardian.empty)}
            </p>
          ) : (
            report && (
              <div
                style={{
                  marginTop: '16px',
                  overflowX: 'auto',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: 'left',
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.dueDate)}
                      </th>
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.amount)}
                      </th>
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.status)}
                      </th>
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.student)}
                      </th>
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.contract)}
                      </th>
                      <th style={{ padding: '8px' }}>
                        {t(i18nKeys.school.reportsUi.guardian.table.paidAt)}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        style={{
                          borderBottom: '1px solid #f3f4f6',
                        }}
                      >
                        <td style={{ padding: '8px' }}>{formatDate(invoice.dueDate)}</td>
                        <td style={{ padding: '8px' }}>{formatAmountBRL(invoice.amountCents)}</td>
                        <td style={{ padding: '8px' }}>{statusLabel(invoice.status)}</td>
                        <td style={{ padding: '8px' }}>{invoice.studentName ?? '—'}</td>
                        <td style={{ padding: '8px' }}>{invoice.contractName ?? '—'}</td>
                        <td style={{ padding: '8px' }}>{formatDate(invoice.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
