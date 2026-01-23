'use client';

import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type TenantStatus = 'ACTIVE' | 'DRAFT' | 'SUSPENDED';

type TenantOption = {
  id: string;
  name: string;
  slug: string;
  schoolCode: string;
  status: TenantStatus;
};

type TenantsResponse = {
  items: TenantOption[];
  total: number;
};

type AuditItem = {
  id: string;
  timestamp: string;
  tenant: { id: string; name: string; slug: string } | null;
  actor: { id: string; email: string; name: string | null } | null;
  actorType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
};

type AuditResponse = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function PlatformAuditPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<AuditItem | null>(null);

  const loadTenants = useCallback(async () => {
    try {
      const response = await apiFetch('/platform/tenants?page=1&pageSize=200');
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as TenantsResponse;
      setTenants(data.items);
    } catch {
      // ignore tenant filter loading errors
    }
  }, [apiFetch]);

  const loadAudit = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', '20');

      if (tenantId) params.set('tenantId', tenantId);
      if (actionFilter.trim()) params.set('action', actionFilter.trim());
      if (actorEmail.trim()) params.set('actorEmail', actorEmail.trim());
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      try {
        const response = await apiFetch(
          `/platform/audit${params.toString() ? `?${params.toString()}` : ''}`
        );
        if (!response.ok) {
          setError(t(i18nKeys.platform.audit.errorGeneric));
          return;
        }
        const data = (await response.json()) as AuditResponse;
        setItems(data.items);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch {
        setError(t(i18nKeys.platform.audit.errorConnection));
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, tenantId, actionFilter, actorEmail, fromDate, toDate, t]
  );

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    void loadAudit(1);
  }, [loadAudit]);

  function formatDate(value: string): string {
    const date = new Date(value);
    const localeTag = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
    return date.toLocaleString(localeTag, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function applyFilters() {
    void loadAudit(1);
  }

  function clearFilters() {
    setTenantId('');
    setActionFilter('');
    setActorEmail('');
    setFromDate('');
    setToDate('');
    void loadAudit(1);
  }

  function handlePrevPage() {
    if (page > 1) {
      void loadAudit(page - 1);
    }
  }

  function handleNextPage() {
    if (page < totalPages) {
      void loadAudit(page + 1);
    }
  }

  function safeStringifyMetadata(metadata: unknown): string {
    if (metadata == null) {
      return t(i18nKeys.platform.audit.modal.metadataEmpty);
    }
    try {
      return JSON.stringify(metadata, null, 2);
    } catch {
      return String(metadata);
    }
  }

  return (
    <section className="flex flex-col h-[calc(100vh-10rem)] gap-4">
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold tracking-tight">{t(i18nKeys.platform.audit.title)}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4 rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="space-y-1">
          <label htmlFor="audit-tenant" className="text-xs font-semibold text-muted-foreground">
            {t(i18nKeys.platform.audit.filters.tenant)}
          </label>
          <select
            id="audit-tenant"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">{t(i18nKeys.common.all)}</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="audit-action" className="text-xs font-semibold text-muted-foreground">
            {t(i18nKeys.platform.audit.filters.action)}
          </label>
          <input
            id="audit-action"
            type="text"
            placeholder={t(i18nKeys.platform.audit.filters.actionPlaceholder)}
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="audit-actorEmail" className="text-xs font-semibold text-muted-foreground">
            {t(i18nKeys.platform.audit.filters.actorEmail)}
          </label>
          <input
            id="audit-actorEmail"
            type="email"
            placeholder="email@example.com"
            value={actorEmail}
            onChange={(event) => setActorEmail(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">
            {t(i18nKeys.platform.audit.filters.from)}
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
          />
        </div>

        <div className="space-y-1 flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              {t(i18nKeys.platform.audit.filters.to)}
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
            />
          </div>

          <div className="flex gap-1 pb-[1px]">
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-3"
              title={t(i18nKeys.platform.audit.filters.apply)}
            >
              ➔
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3"
              title={t(i18nKeys.platform.audit.filters.clear)}
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">{t(i18nKeys.common.loading)}</div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">{t(i18nKeys.platform.audit.empty)}</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="sticky top-0 bg-secondary/90 backdrop-blur z-10 [&_tr]:border-b">
                <tr className="border-b transition-colors">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.audit.table.timestamp)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.audit.table.action)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.audit.table.tenant)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.audit.table.actor)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">
                    {t(i18nKeys.platform.audit.table.target)}
                  </th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-20">
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {items.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-3 align-middle whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="p-3 align-middle font-medium">
                      <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary-foreground hover:bg-primary/20 dark:text-primary">
                        {item.action}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      {item.tenant ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-xs">{item.tenant.name}</span>
                          {/* <span className="text-[10px] text-muted-foreground">{item.tenant.slug}</span> */}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                    <td className="p-3 align-middle">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold ring-1 ring-border">
                          {(item.actor?.name?.[0] || item.actor?.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div className="flex flex-col max-w-[150px]">
                          {item.actor?.name && <span className="text-xs font-medium truncate">{item.actor.name}</span>}
                          <span className="text-[10px] text-muted-foreground truncate" title={item.actor?.email}>{item.actor?.email || item.actorType}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-middle text-xs">
                      {item.targetType ? (
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">{item.targetType}</span>
                      ) : '-'}
                    </td>
                    <td className="p-3 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3"
                      >
                        {t(i18nKeys.platform.audit.table.details)}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 0 && (
          <div className="border-t bg-muted/40 p-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground pl-2">
              {t(i18nKeys.common.page)} <strong>{page}</strong> {t(i18nKeys.common.of)} <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-1">
              <button
                onClick={handlePrevPage}
                disabled={page <= 1}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8"
              >
                ‹
              </button>
              <button
                onClick={handleNextPage}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col space-y-1.5 p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  {selectedItem.action}
                  <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                    {formatDate(selectedItem.timestamp)}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="p-0">
              <div className="grid grid-cols-2 gap-4 p-6 bg-muted/20 border-b text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">{t(i18nKeys.platform.audit.table.actor)}</span>
                  <div className="font-medium">{selectedItem.actor?.name || selectedItem.actor?.email || t(i18nKeys.platform.audit.system)}</div>
                  <div className="text-xs text-muted-foreground">{selectedItem.actor?.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">IP: {selectedItem.ip || '-'}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">{t(i18nKeys.platform.audit.table.target)}</span>
                  <div className="font-medium">{selectedItem.targetType || '-'}</div>
                  <div className="text-xs text-muted-foreground">{selectedItem.targetId}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t(i18nKeys.platform.audit.table.tenant)}: {selectedItem.tenant?.name}</div>
                </div>
              </div>
              <div className="p-4 bg-slate-950 text-slate-50 overflow-auto max-h-[300px] text-xs font-mono">
                <pre>{safeStringifyMetadata(selectedItem.metadata)}</pre>
              </div>
            </div>
            <div className="flex items-center p-4 justify-end border-t bg-muted/20">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                {t(i18nKeys.platform.audit.modal.close)}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
