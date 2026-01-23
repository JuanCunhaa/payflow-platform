'use client';

import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED';

type Lead = {
  id: string;
  name: string;
  schoolName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
};

type LeadsResponse = {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type StatusFilter = 'all' | LeadStatus;

export default function PlatformLeadsPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  const loadLeads = useCallback(
    async (filter: StatusFilter) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      try {
        const response = await apiFetch(
          `/platform/leads${params.toString() ? `?${params.toString()}` : ''}`
        );
        if (!response.ok) {
          setError(t(i18nKeys.platform.leads.errorGeneric));
          return;
        }
        const data = (await response.json()) as LeadsResponse;
        setLeads(data.items);
      } catch {
        setError(t(i18nKeys.platform.leads.errorConnection));
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, t]
  );

  useEffect(() => {
    void loadLeads(statusFilter);
  }, [statusFilter, loadLeads]);

  async function handleStatusChange(id: string, status: LeadStatus) {
    setMutatingId(id);
    setError(null);
    try {
      const response = await apiFetch(`/platform/leads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setError(t(i18nKeys.platform.leads.errorGeneric));
        return;
      }
      await loadLeads(statusFilter);
    } catch {
      setError(t(i18nKeys.platform.leads.errorConnection));
    } finally {
      setMutatingId(null);
    }
  }

  async function handleConvertToTenant(id: string) {
    setMutatingId(id);
    setError(null);
    try {
      const response = await apiFetch(`/platform/leads/${id}/convert-to-tenant`, {
        method: 'POST',
      });
      if (!response.ok) {
        setError(t(i18nKeys.platform.leads.errorGeneric));
        return;
      }
      await loadLeads(statusFilter);
    } catch {
      setError(t(i18nKeys.platform.leads.errorConnection));
    } finally {
      setMutatingId(null);
    }
  }

  function formatDate(value: string): string {
    const date = new Date(value);
    const localeTag = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
    return date.toLocaleString(localeTag, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function statusLabel(status: LeadStatus): string {
    if (status === 'NEW') {
      return t(i18nKeys.platform.leads.status.new);
    }
    if (status === 'CONTACTED') {
      return t(i18nKeys.platform.leads.status.contacted);
    }
    return t(i18nKeys.platform.leads.status.converted);
  }

  return (
    <section className="flex flex-col h-[calc(100vh-10rem)] gap-4">
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold tracking-tight">{t(i18nKeys.platform.leads.title)}</h1>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">{t(i18nKeys.common.all)}</option>
          <option value="NEW">{t(i18nKeys.platform.leads.status.new)}</option>
          <option value="CONTACTED">{t(i18nKeys.platform.leads.status.contacted)}</option>
          <option value="CONVERTED">{t(i18nKeys.platform.leads.status.converted)}</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">{t(i18nKeys.common.loading)}</div>
        ) : leads.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">{t(i18nKeys.platform.leads.empty)}</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10 [&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.schoolName)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.responsibleName)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.email)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.phone)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.status)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.leads.table.createdAt)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">{t(i18nKeys.common.actions)}</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-3 align-middle">{lead.schoolName}</td>
                    <td className="p-3 align-middle">{lead.name}</td>
                    <td className="p-3 align-middle">{lead.email}</td>
                    <td className="p-3 align-middle">{lead.phone}</td>
                    <td className="p-3 align-middle">
                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${lead.status === 'NEW'
                        ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-900/50'
                        : lead.status === 'CONTACTED'
                          ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20 dark:bg-yellow-900/30 dark:text-yellow-400 dark:ring-yellow-900/50'
                          : 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-900/50'
                        }`}>
                        {statusLabel(lead.status)}
                      </span>
                    </td>
                    <td className="p-3 align-middle">{formatDate(lead.createdAt)}</td>
                    <td className="p-3 align-middle">
                      <div className="flex gap-2 flex-wrap">
                        {lead.status !== 'CONTACTED' && lead.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(lead.id, 'CONTACTED')}
                            disabled={mutatingId === lead.id}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3"
                          >
                            {t(i18nKeys.platform.leads.actions.markContacted)}
                          </button>
                        )}
                        {lead.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(lead.id, 'CONVERTED')}
                            disabled={mutatingId === lead.id}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 h-7 px-3"
                          >
                            {t(i18nKeys.platform.leads.actions.markConverted)}
                          </button>
                        )}
                        {lead.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            onClick={() => void handleConvertToTenant(lead.id)}
                            disabled={mutatingId === lead.id}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-7 px-3"
                          >
                            {t(i18nKeys.platform.leads.actions.convertToTenant)}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
