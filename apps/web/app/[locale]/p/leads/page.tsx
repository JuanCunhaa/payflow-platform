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
          `/platform/leads${params.toString() ? `?${params.toString()}` : ''}`,
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
    [apiFetch, t],
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
    <section>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            marginBottom: 0,
          }}
        >
          {t(i18nKeys.platform.leads.title)}
        </h1>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          style={{
            padding: '6px 10px',
            borderRadius: '999px',
            border: '1px solid #cbd5f5',
            fontSize: '14px',
          }}
        >
          <option value="all">Todos</option>
          <option value="NEW">{t(i18nKeys.platform.leads.status.new)}</option>
          <option value="CONTACTED">
            {t(i18nKeys.platform.leads.status.contacted)}
          </option>
          <option value="CONVERTED">
            {t(i18nKeys.platform.leads.status.converted)}
          </option>
        </select>
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
      ) : leads.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {t(i18nKeys.platform.leads.empty)}
        </p>
      ) : (
        <div
          style={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflowX: 'auto',
            backgroundColor: '#ffffff',
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
                  {t(i18nKeys.platform.leads.table.schoolName)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.leads.table.responsibleName)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.leads.table.email)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.leads.table.phone)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.leads.table.status)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.leads.table.createdAt)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>{lead.schoolName}</td>
                  <td style={{ padding: '8px 12px' }}>{lead.name}</td>
                  <td style={{ padding: '8px 12px' }}>{lead.email}</td>
                  <td style={{ padding: '8px 12px' }}>{lead.phone}</td>
                  <td style={{ padding: '8px 12px' }}>{statusLabel(lead.status)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {formatDate(lead.createdAt)}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      {lead.status !== 'CONTACTED' && lead.status !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(lead.id, 'CONTACTED')}
                          disabled={mutatingId === lead.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#f9fafb',
                            cursor:
                              mutatingId === lead.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t(i18nKeys.platform.leads.actions.markContacted)}
                        </button>
                      )}
                      {lead.status !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(lead.id, 'CONVERTED')}
                          disabled={mutatingId === lead.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#f3f4f6',
                            cursor:
                              mutatingId === lead.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t(i18nKeys.platform.leads.actions.markConverted)}
                        </button>
                      )}
                      {lead.status !== 'CONVERTED' && (
                        <button
                          type="button"
                          onClick={() => void handleConvertToTenant(lead.id)}
                          disabled={mutatingId === lead.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '999px',
                            border: 'none',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            cursor:
                              mutatingId === lead.id ? 'not-allowed' : 'pointer',
                          }}
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
    </section>
  );
}
