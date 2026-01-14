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
          `/platform/audit${params.toString() ? `?${params.toString()}` : ''}`,
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
    [apiFetch, tenantId, actionFilter, actorEmail, fromDate, toDate, t],
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
    <section>
      <h1
        style={{
          fontSize: '20px',
          marginBottom: '12px',
        }}
      >
        {t(i18nKeys.platform.audit.title)}
      </h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          backgroundColor: '#ffffff',
        }}
      >
        <div>
          <label
            htmlFor="audit-tenant"
            style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
          >
            {t(i18nKeys.platform.audit.filters.tenant)}
          </label>
          <select
            id="audit-tenant"
            value={tenantId}
            onChange={(event) => setTenantId(event.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
            }}
          >
            <option value="">Todos</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} ({tenant.slug})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="audit-action"
            style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
          >
            {t(i18nKeys.platform.audit.filters.action)}
          </label>
          <input
            id="audit-action"
            type="text"
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="audit-actorEmail"
            style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
          >
            {t(i18nKeys.platform.audit.filters.actorEmail)}
          </label>
          <input
            id="audit-actorEmail"
            type="email"
            value={actorEmail}
            onChange={(event) => setActorEmail(event.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="audit-from"
            style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
          >
            {t(i18nKeys.platform.audit.filters.from)}
          </label>
          <input
            id="audit-from"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="audit-to"
            style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}
          >
            {t(i18nKeys.platform.audit.filters.to)}
          </label>
          <input
            id="audit-to"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={applyFilters}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {t(i18nKeys.platform.audit.filters.apply)}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              borderRadius: '999px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {t(i18nKeys.platform.audit.filters.clear)}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: '12px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p>{t(i18nKeys.common.loading)}</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {t(i18nKeys.platform.audit.empty)}
        </p>
      ) : (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            backgroundColor: '#ffffff',
            marginBottom: '12px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead style={{ backgroundColor: '#f9fafb' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.timestamp)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.tenant)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.actor)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.action)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.target)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.ip)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.audit.table.details)}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>
                    {formatDate(item.timestamp)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.tenant ? `${item.tenant.name} (${item.tenant.slug})` : '-'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.actor
                      ? item.actor.name
                        ? `${item.actor.name} <${item.actor.email}>`
                        : item.actor.email
                      : item.actorType}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{item.action}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {item.targetType
                      ? item.targetId
                        ? `${item.targetType} (${item.targetId})`
                        : item.targetType
                      : '-'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>{item.ip ?? '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        borderRadius: '999px',
                        border: '1px solid #e5e7eb',
                        backgroundColor: '#f9fafb',
                        cursor: 'pointer',
                      }}
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

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
          }}
        >
          <span>
            Página {page} de {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={page <= 1}
              style={{
                padding: '6px 10px',
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
                padding: '6px 10px',
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
      )}

      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.4)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50,
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            style={{
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.3)',
              overflow: 'auto',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <h2
                style={{
                  fontSize: '16px',
                  margin: 0,
                }}
              >
                {t(i18nKeys.platform.audit.modal.title)} – {selectedItem.action}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ×
              </button>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: '8px',
              }}
            >
              {formatDate(selectedItem.timestamp)} –{' '}
              {selectedItem.tenant
                ? `${selectedItem.tenant.name} (${selectedItem.tenant.slug})`
                : '—'}
            </p>

            <pre
              style={{
                fontSize: '12px',
                backgroundColor: '#0f172a',
                color: '#e5e7eb',
                padding: '12px',
                borderRadius: '8px',
                overflowX: 'auto',
              }}
            >
              {safeStringifyMetadata(selectedItem.metadata)}
            </pre>

            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                }}
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
