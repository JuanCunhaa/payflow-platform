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

        const res = await apiFetch(`/school/reports/summary?from=${fromStr}&to=${toStr}`);

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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-2 mt-0 text-xl font-semibold">
          {t(i18nKeys.school.pages.dashboard.title)}
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          {t(i18nKeys.school.pages.dashboard.description)}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="dashboard-period"
          className="flex items-center gap-2 text-sm text-foreground"
        >
          <span>{t(i18nKeys.school.dashboardUi.periodLabel)}</span>
          <input
            id="dashboard-period"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {loading && (
          <span className="text-xs text-muted-foreground">
            {t(i18nKeys.common.loading)}
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
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
          value={summary ? String(summary.overdueInvoicesCount) : loading ? '' : '0'}
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
    <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">
        {label}
      </div>
      <div className="text-xl font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}
