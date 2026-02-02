'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getApiBase } from '../../../api-base';
import { useI18n } from '@/app/i18n-context';
import { i18nKeys } from '@payflow/shared';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type SandboxInvoice = {
  invoiceId: string;
  status: InvoiceStatus;
  amountCents: number;
  dueDate: string;
  studentName: string | null;
  guardianName: string | null;
};

type ViewState =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'ready'; invoice: SandboxInvoice; confirming: boolean; success: boolean | null };

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

export default function SandboxPaymentPage() {
  const { t } = useI18n();
  const params = useParams<{ invoiceId: string }>();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ViewState>({ type: 'loading' });

  const invoiceId = params.invoiceId;
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    if (!invoiceId || !token) {
      setState({
        type: 'error',
        message: t(i18nKeys.pay.sandbox.error.invalidLink),
      });
      return;
    }

    let cancelled = false;

    async function load() {
      setState({ type: 'loading' });
      try {
        const res = await fetch(
          `${getApiBase()}/public/pay/sandbox/${encodeURIComponent(invoiceId)}?token=${encodeURIComponent(
            token
          )}`
        );

        if (!res.ok) {
          setState({
            type: 'error',
            message: t(i18nKeys.pay.sandbox.error.loadError),
          });
          return;
        }

        const data = (await res.json()) as SandboxInvoice;
        if (!cancelled) {
          setState({
            type: 'ready',
            invoice: data,
            confirming: false,
            success: null,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            type: 'error',
            message: t(i18nKeys.pay.sandbox.error.connectionError),
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [invoiceId, token, t]);

  async function handleConfirm(method: 'PIX' | 'CARD') {
    if (state.type !== 'ready' || state.confirming) return;

    setState({ ...state, confirming: true, success: null });

    try {
      const res = await fetch(
        `${getApiBase()}/public/pay/sandbox/${encodeURIComponent(invoiceId)}/confirm?token=${encodeURIComponent(
          token
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ method }),
        }
      );

      if (!res.ok) {
        setState({
          type: 'error',
          message: t(i18nKeys.pay.sandbox.error.confirmError),
        });
        return;
      }

      setState({
        type: 'ready',
        invoice: { ...state.invoice, status: 'PAID' },
        confirming: false,
        success: true,
      });
    } catch {
      setState({
        type: 'error',
        message: t(i18nKeys.pay.sandbox.error.connectionError),
      });
    }
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: '#0f172a',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '480px',
    borderRadius: '16px',
    backgroundColor: '#020617',
    color: '#e5e7eb',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(15,23,42,0.6)',
    border: '1px solid #1f2937',
  };

  if (state.type === 'loading') {
    return (
      <main style={containerStyle}>
        <section style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>
            {t(i18nKeys.pay.sandbox.title)}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#9ca3af' }}>
            {t(i18nKeys.pay.sandbox.loading)}
          </p>
        </section>
      </main>
    );
  }

  if (state.type === 'error') {
    return (
      <main style={containerStyle}>
        <section style={cardStyle}>
          <h1 style={{ marginTop: 0, marginBottom: '8px', fontSize: '20px' }}>
            {t(i18nKeys.pay.sandbox.title)}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#fca5a5' }}>{state.message}</p>
        </section>
      </main>
    );
  }

  const { invoice } = state;

  const isPaid = invoice.status === 'PAID';

  return (
    <main style={containerStyle}>
      <section style={cardStyle}>
        <h1
          style={{
            marginTop: 0,
            marginBottom: '4px',
            fontSize: '20px',
            fontWeight: 600,
          }}
        >
          {t(i18nKeys.pay.sandbox.title)}
        </h1>
        <p
          style={{
            margin: 0,
            marginBottom: '16px',
            fontSize: '13px',
            color: '#9ca3af',
          }}
        >
          {t(i18nKeys.pay.sandbox.description)}
        </p>

        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(59,130,246,0.15))',
            border: '1px solid rgba(148,163,184,0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#cbd5f5' }}>
              {t(i18nKeys.pay.sandbox.student)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{invoice.studentName ?? '-'}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#cbd5f5' }}>
              {t(i18nKeys.pay.sandbox.guardian)}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{invoice.guardianName ?? '-'}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <span style={{ fontSize: '13px', color: '#cbd5f5' }}>
              {t(i18nKeys.pay.sandbox.amount)}
            </span>
            <span style={{ fontSize: '16px', fontWeight: 600 }}>
              {formatAmountBRL(invoice.amountCents)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '13px', color: '#cbd5f5' }}>
              {t(i18nKeys.pay.sandbox.dueDate)}
            </span>
            <span style={{ fontSize: '14px' }}>{formatDate(invoice.dueDate)}</span>
          </div>
        </div>

        <div
          style={{
            marginBottom: '12px',
            fontSize: '13px',
            color: isPaid ? '#4ade80' : '#facc15',
          }}
        >
          Status:{' '}
          <strong>
            {isPaid
              ? t(i18nKeys.pay.sandbox.status.paid)
              : invoice.status === 'OVERDUE'
                ? t(i18nKeys.pay.sandbox.status.overdue)
                : t(i18nKeys.pay.sandbox.status.pending)}
          </strong>
        </div>

        {state.success && (
          <p
            style={{
              marginTop: 0,
              marginBottom: '12px',
              fontSize: '13px',
              color: '#4ade80',
            }}
          >
            {t(i18nKeys.pay.sandbox.success)}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => void handleConfirm('PIX')}
            disabled={isPaid || state.confirming}
            style={{
              padding: '10px 12px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: isPaid ? '#4b5563' : '#22c55e',
              color: '#ffffff',
              cursor: isPaid ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {state.confirming
              ? t(i18nKeys.pay.sandbox.actions.confirming)
              : t(i18nKeys.pay.sandbox.actions.payPix)}
          </button>

          <button
            type="button"
            onClick={() => void handleConfirm('CARD')}
            disabled={isPaid || state.confirming}
            style={{
              padding: '10px 12px',
              borderRadius: '999px',
              border: '1px solid #6366f1',
              backgroundColor: isPaid ? 'transparent' : '#020617',
              color: '#e5e7eb',
              cursor: isPaid ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {state.confirming
              ? t(i18nKeys.pay.sandbox.actions.confirming)
              : t(i18nKeys.pay.sandbox.actions.payCard)}
          </button>
        </div>
      </section>
    </main>
  );
}
