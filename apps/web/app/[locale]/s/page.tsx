'use client';

import { useEffect, useMemo, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { useAuth } from '../../auth-context';

type SummaryResponse = {
  totalBilledCents: number;
  totalOpenCents: number;
  totalOverdueCents: number;
  openInvoicesCount: number;
  overdueInvoicesCount: number;
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

export default function SchoolDashboardPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const initialMonth = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSummary() {
      setLoading(true);
      setError(null);

      try {
        const [yearStr, monthStr] = selectedMonth.split('-');
        const year = Number(yearStr);
        const month = Number(monthStr);

        if (!Number.isFinite(year) || !Number.isFinite(month)) {
          throw new Error('invalid_month');
        }

        const from = new Date(Date.UTC(year, month - 1, 1));
        const to = new Date(Date.UTC(year, month, 0));

        const fromStr = from.toISOString().slice(0, 10);
        const toStr = to.toISOString().slice(0, 10);

        const res = await apiFetch(
          `/school/reports/summary?from=${fromStr}&to=${toStr}`
        );

        if (!res.ok) {
          throw new Error(`request_failed_${res.status}`);
        }

        const data = (await res.json()) as SummaryResponse;
        if (!cancelled) {
          setSummary(data);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.school.dashboardUi.feedback.loadError));
          setSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, selectedMonth, t]);

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
            marginBottom: '8px',
          }}
        >
          {t(i18nKeys.school.pages.dashboard.title)}
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
          }}
        >
          {t(i18nKeys.school.pages.dashboard.description)}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <label
          htmlFor="dashboard-period"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#0f172a',
          }}
        >
          <span>{t(i18nKeys.school.dashboardUi.periodLabel)}</span>
          <input
            id="dashboard-period"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
              fontSize: '14px',
            }}
          />
        </label>
        {loading && (
          <span
            style={{
              fontSize: '13px',
              color: '#64748b',
            }}
          >
            {t(i18nKeys.common.loading)}
          </span>
        )}
      </div>

      {error && (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            padding: '10px 12px',
            fontSize: '13px',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        <DashboardCard
          label={t(i18nKeys.school.dashboardUi.cards.totalBilled)}
          value={summary ? formatAmountBRL(summary.totalBilledCents) : '—'}
        />
        <DashboardCard
          label={t(i18nKeys.school.dashboardUi.cards.totalOpen)}
          value={summary ? formatAmountBRL(summary.totalOpenCents) : '—'}
        />
        <DashboardCard
          label={t(i18nKeys.school.dashboardUi.cards.totalOverdue)}
          value={summary ? formatAmountBRL(summary.totalOverdueCents) : '—'}
        />
        <DashboardCard
          label={t(i18nKeys.school.dashboardUi.cards.overdueCount)}
          value={
            summary ? String(summary.overdueInvoicesCount) : loading ? '' : '0'
          }
        />
      </div>
    </div>
  );
}

type DashboardCardProps = {
  label: string;
  value: string;
};

function DashboardCard({ label, value }: DashboardCardProps) {
  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 6px 18px rgba(15,23,42,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          color: '#64748b',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {value}
      </div>
    </div>
  );
}
