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
    <section className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t(i18nKeys.platform.audit.title)}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 rounded-xl border bg-card text-card-foreground shadow">
        <div className="space-y-2">
          <label htmlFor="audit-tenant" className="text-sm font-medium leading-none">
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
                {tenant.name} ({tenant.slug})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="audit-action" className="text-sm font-medium leading-none">
            {t(i18nKeys.platform.audit.filters.action)}
          </label>
          <input
            id="audit-action"
            type="text"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="audit-actorEmail" className="text-sm font-medium leading-none">
            {t(i18nKeys.platform.audit.filters.actorEmail)}
          </label>
          <input
            id="audit-actorEmail"
            type="email"
            value={actorEmail}
            onChange={(event) => setActorEmail(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="audit-from" className="text-sm font-medium leading-none">
            {t(i18nKeys.platform.audit.filters.from)}
          </label>
          <input
            id="audit-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="audit-to" className="text-sm font-medium leading-none">
            {t(i18nKeys.platform.audit.filters.to)}
          </label>
          <input
            id="audit-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex items-end gap-2 col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-3 justify-end">
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            {t(i18nKeys.platform.audit.filters.apply)}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            {t(i18nKeys.platform.audit.filters.clear)}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8 text-muted-foreground">{t(i18nKeys.common.loading)}</div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t(i18nKeys.platform.audit.empty)}</p>
      ) : (
        <div className="rounded-md border bg-card text-card-foreground">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.timestamp)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.tenant)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.actor)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.action)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.target)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.ip)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.audit.table.details)}
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {items.map((item) => (
                  <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 whitespace-nowrap">{formatDate(item.timestamp)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {item.tenant ? `${item.tenant.name}` : '-'}
                      {item.tenant && <span className="block text-xs text-muted-foreground">{item.tenant.slug}</span>}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 max-w-[200px] truncate" title={item.actor?.email || ''}>
                      {item.actor
                        ? item.actor.name
                          ? `${item.actor.name}`
                          : item.actor.email
                        : item.actorType}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 font-medium">{item.action}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      {item.targetType
                        ? item.targetId
                          ? `${item.targetType} (${item.targetId.slice(0, 8)}...)`
                          : item.targetType
                        : '-'}
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{item.ip ?? '-'}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
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
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm py-2">
          <span className="text-muted-foreground">
            {t(i18nKeys.common.page)} {page} {t(i18nKeys.common.of)} {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page <= 1}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col space-y-1.5 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {t(i18nKeys.platform.audit.modal.title)} – {selectedItem.action}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className="text-xl">×</span>
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDate(selectedItem.timestamp)} –{' '}
                {selectedItem.tenant
                  ? `${selectedItem.tenant.name} (${selectedItem.tenant.slug})`
                  : '—'}
              </p>
            </div>
            <div className="p-6 pt-0">
              <pre className="rounded-md bg-muted p-4 overflow-auto text-xs font-mono max-h-[60vh]">
                {safeStringifyMetadata(selectedItem.metadata)}
              </pre>
            </div>
            <div className="flex items-center p-6 pt-0 justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
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
