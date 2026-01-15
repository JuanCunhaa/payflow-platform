'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type TenantStatus = 'ACTIVE' | 'DRAFT' | 'SUSPENDED';

type Tenant = {
  id: string;
  name: string;
  slug: string;
  schoolCode: string;
  status: TenantStatus;
  createdAt: string;
};

type TenantsResponse = {
  items: Tenant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type StatusFilter = 'all' | TenantStatus;
type FormMode = 'create' | 'edit';

export default function PlatformTenantsPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [schoolCode, setSchoolCode] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const loadTenants = useCallback(
    async (filter: StatusFilter) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.set('status', filter);
      }

      try {
        const response = await apiFetch(
          `/platform/tenants${params.toString() ? `?${params.toString()}` : ''}`
        );
        if (!response.ok) {
          setError(t(i18nKeys.platform.tenants.errorGeneric));
          return;
        }
        const data = (await response.json()) as TenantsResponse;
        setTenants(data.items);
      } catch {
        setError(t(i18nKeys.platform.tenants.errorConnection));
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, t]
  );

  useEffect(() => {
    void loadTenants(statusFilter);
  }, [statusFilter, loadTenants]);

  function resetForm() {
    setName('');
    setSlug('');
    setSchoolCode('');
    setAdminEmail('');
    setAdminName('');
    setAdminPassword('');
    setGeneratedPassword(null);
    setEditingId(null);
    setFormMode('create');
  }

  function openCreateForm() {
    resetForm();
    setFormMode('create');
    setFormVisible(true);
  }

  function openEditForm(tenant: Tenant) {
    setName(tenant.name);
    setSlug(tenant.slug);
    setSchoolCode(tenant.schoolCode);
    setAdminEmail('');
    setAdminName('');
    setAdminPassword('');
    setGeneratedPassword(null);
    setEditingId(tenant.id);
    setFormMode('edit');
    setFormVisible(true);
  }

  function statusLabel(status: TenantStatus): string {
    if (status === 'ACTIVE') {
      return t(i18nKeys.platform.tenants.status.active);
    }
    if (status === 'SUSPENDED') {
      return t(i18nKeys.platform.tenants.status.suspended);
    }
    return t(i18nKeys.platform.tenants.status.draft);
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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormSubmitting(true);
    setError(null);
    setGeneratedPassword(null);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      slug: slug.trim(),
      schoolCode: schoolCode.trim(),
    };

    let url = '/platform/tenants';
    let method: 'POST' | 'PUT' = 'POST';

    if (formMode === 'edit' && editingId) {
      url = `/platform/tenants/${editingId}`;
      method = 'PUT';
    } else {
      payload.adminEmail = adminEmail.trim();
      payload.adminName = adminName.trim();
      if (adminPassword.trim()) {
        payload.adminPassword = adminPassword.trim();
      }
    }

    try {
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(t(i18nKeys.platform.tenants.errorGeneric));
        return;
      }

      if (formMode === 'create' && data?.adminInitialPassword) {
        setGeneratedPassword(data.adminInitialPassword as string);
      }

      await loadTenants(statusFilter);
      if (formMode === 'edit') {
        setFormVisible(false);
        resetForm();
      } else {
        setName('');
        setSlug('');
        setSchoolCode('');
        setAdminEmail('');
        setAdminName('');
        setAdminPassword('');
      }
    } catch {
      setError(t(i18nKeys.platform.tenants.errorConnection));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, next: TenantStatus) {
    setActionId(id);
    setError(null);
    try {
      const response = await apiFetch(
        `/platform/tenants/${id}/${next === 'ACTIVE' ? 'activate' : 'suspend'}`,
        { method: 'POST' }
      );
      if (!response.ok) {
        setError(t(i18nKeys.platform.tenants.errorGeneric));
        return;
      }
      await loadTenants(statusFilter);
    } catch {
      setError(t(i18nKeys.platform.tenants.errorConnection));
    } finally {
      setActionId(null);
    }
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
          {t(i18nKeys.platform.tenants.title)}
        </h1>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            <option value="DRAFT">{t(i18nKeys.platform.tenants.status.draft)}</option>
            <option value="ACTIVE">{t(i18nKeys.platform.tenants.status.active)}</option>
            <option value="SUSPENDED">{t(i18nKeys.platform.tenants.status.suspended)}</option>
          </select>

          <button
            type="button"
            onClick={openCreateForm}
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
            {t(i18nKeys.platform.tenants.form.submitCreate)}
          </button>
        </div>
      </div>

      {formVisible && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginBottom: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '16px',
            backgroundColor: '#ffffff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>
              {formMode === 'create'
                ? t(i18nKeys.platform.tenants.form.createTitle)
                : t(i18nKeys.platform.tenants.form.editTitle)}
            </strong>
          </div>

          <div>
            <label
              htmlFor="tenant-name"
              style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}
            >
              {t(i18nKeys.platform.tenants.form.name)}
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              htmlFor="tenant-slug"
              style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}
            >
              {t(i18nKeys.platform.tenants.form.slug)}
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
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
              htmlFor="tenant-schoolCode"
              style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}
            >
              {t(i18nKeys.platform.tenants.form.schoolCode)}
            </label>
            <input
              id="tenant-schoolCode"
              type="text"
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5f5',
              }}
            />
          </div>

          {formMode === 'create' && (
            <>
              <div>
                <label
                  htmlFor="tenant-adminEmail"
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  {t(i18nKeys.platform.tenants.form.adminEmail)}
                </label>
                <input
                  id="tenant-adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
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
                  htmlFor="tenant-adminName"
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  {t(i18nKeys.platform.tenants.form.adminName)}
                </label>
                <input
                  id="tenant-adminName"
                  type="text"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
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
                  htmlFor="tenant-adminPassword"
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '13px',
                  }}
                >
                  {t(i18nKeys.platform.tenants.form.adminPassword)}
                </label>
                <input
                  id="tenant-adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5f5',
                  }}
                />
              </div>
            </>
          )}

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFormVisible(false);
                resetForm();
              }}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '999px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                cursor: formSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {formMode === 'create'
                ? t(i18nKeys.platform.tenants.form.submitCreate)
                : t(i18nKeys.platform.tenants.form.submitEdit)}
            </button>
          </div>

          {generatedPassword && (
            <div
              style={{
                gridColumn: '1 / -1',
                marginTop: '4px',
                fontSize: '13px',
                color: '#166534',
              }}
            >
              <strong>Senha inicial gerada:</strong> {generatedPassword}
            </div>
          )}
        </form>
      )}

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
      ) : tenants.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#6b7280' }}>{t(i18nKeys.platform.tenants.empty)}</p>
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
                  {t(i18nKeys.platform.tenants.table.name)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.tenants.table.slug)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.tenants.table.schoolCode)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.tenants.table.status)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.tenants.table.createdAt)}
                </th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                  {t(i18nKeys.platform.tenants.table.actions)}
                </th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px' }}>{tenant.name}</td>
                  <td style={{ padding: '8px 12px' }}>{tenant.slug}</td>
                  <td style={{ padding: '8px 12px' }}>{tenant.schoolCode}</td>
                  <td style={{ padding: '8px 12px' }}>{statusLabel(tenant.status)}</td>
                  <td style={{ padding: '8px 12px' }}>{formatDate(tenant.createdAt)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEditForm(tenant)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '999px',
                          border: '1px solid #e5e7eb',
                          backgroundColor: '#f9fafb',
                          cursor: 'pointer',
                        }}
                      >
                        {t(i18nKeys.platform.tenants.form.submitEdit)}
                      </button>
                      {tenant.status !== 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(tenant.id, 'ACTIVE')}
                          disabled={actionId === tenant.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '999px',
                            border: '1px solid #bbf7d0',
                            backgroundColor: '#ecfdf3',
                            color: '#166534',
                            cursor: actionId === tenant.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t(i18nKeys.platform.tenants.status.active)}
                        </button>
                      )}
                      {tenant.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(tenant.id, 'SUSPENDED')}
                          disabled={actionId === tenant.id}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            borderRadius: '999px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: actionId === tenant.id ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {t(i18nKeys.platform.tenants.status.suspended)}
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
