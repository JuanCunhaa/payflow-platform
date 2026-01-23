'use client';

import { useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type OverdueItem = {
  invoiceId: string;
  student: string | null;
  guardian: string | null;
  amountCents: number;
  dueDate: string;
  status: InvoiceStatus;
  daysOverdue: number;
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

export default function SchoolOverdueReportPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [items, setItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setActionError(null);
      setCopySuccess(null);

      try {
        const res = await apiFetch('/school/reports/overdue');
        if (!res.ok) {
          if (!cancelled) {
            setError(t(i18nKeys.school.reportsUi.overdue.feedback.loadError));
            setItems([]);
          }
          return;
        }
        const data = (await res.json()) as OverdueItem[];
        if (!cancelled) {
          setItems(data);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.school.reportsUi.overdue.feedback.loadError));
          setItems([]);
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
  }, [apiFetch, t]);

  async function handleCopyPaymentLink(item: OverdueItem) {
    setActionError(null);
    setCopySuccess(null);
    setActionLoadingId(item.invoiceId);

    try {
      const res = await apiFetch(`/school/invoices/${item.invoiceId}/payment-link`, {
        method: 'POST',
      });

      if (!res.ok) {
        setActionError(t(i18nKeys.school.reportsUi.overdue.feedback.paymentError));
        return;
      }

      const data = (await res.json()) as { paymentLink: string };
      const link = data.paymentLink;

      if (!link) {
        setActionError(t(i18nKeys.school.reportsUi.overdue.feedback.paymentError));
        return;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(link);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = link;
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        setCopySuccess(t(i18nKeys.school.reportsUi.overdue.actions.copyPaymentLinkSuccess));
      } catch {
        setActionError(t(i18nKeys.school.reportsUi.overdue.feedback.paymentError));
      }
    } catch {
      setActionError(t(i18nKeys.school.reportsUi.overdue.feedback.paymentError));
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
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
          marginBottom: '8px',
        }}
      >
        {t(i18nKeys.school.reportsUi.overdue.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          marginTop: 0,
          marginBottom: '16px',
        }}
      >
        {t(i18nKeys.school.reportsUi.overdue.description)}
      </p>

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

      {actionError && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {actionError}
        </div>
      )}

      {copySuccess && (
        <div
          style={{
            marginBottom: '12px',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            backgroundColor: '#ecfdf5',
            color: '#166534',
            fontSize: '13px',
          }}
        >
          {copySuccess}
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
      ) : items.length === 0 ? (
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.school.reportsUi.overdue.empty)}
        </p>
      ) : (
        <div
          style={{
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
                  {t(i18nKeys.school.reportsUi.overdue.table.student)}
                </th>
                <th style={{ padding: '8px' }}>
                  {t(i18nKeys.school.reportsUi.overdue.table.guardian)}
                </th>
                <th style={{ padding: '8px' }}>
                  {t(i18nKeys.school.reportsUi.overdue.table.daysOverdue)}
                </th>
                <th style={{ padding: '8px' }}>
                  {t(i18nKeys.school.reportsUi.overdue.table.amount)}
                </th>
                <th style={{ padding: '8px' }}>
                  {t(i18nKeys.school.reportsUi.overdue.table.actions)}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.invoiceId}
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <td style={{ padding: '8px' }}>{item.student ?? '—'}</td>
                  <td style={{ padding: '8px' }}>{item.guardian ?? '—'}</td>
                  <td style={{ padding: '8px' }}>{item.daysOverdue}</td>
                  <td style={{ padding: '8px' }}>{formatAmountBRL(item.amountCents)}</td>
                  <td style={{ padding: '8px' }}>
                    <button
                      type="button"
                      onClick={() => void handleCopyPaymentLink(item)}
                      disabled={actionLoadingId === item.invoiceId}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        border: 'none',
                        backgroundColor: actionLoadingId === item.invoiceId ? '#93c5fd' : '#2563eb',
                        color: '#ffffff',
                        cursor: actionLoadingId === item.invoiceId ? 'default' : 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      {t(i18nKeys.school.reportsUi.overdue.actions.copyPaymentLink)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
