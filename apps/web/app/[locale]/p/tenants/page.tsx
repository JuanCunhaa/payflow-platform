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
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t(i18nKeys.platform.tenants.title)}</h1>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">{t(i18nKeys.common.all)}</option>
            <option value="DRAFT">{t(i18nKeys.platform.tenants.status.draft)}</option>
            <option value="ACTIVE">{t(i18nKeys.platform.tenants.status.active)}</option>
            <option value="SUSPENDED">{t(i18nKeys.platform.tenants.status.suspended)}</option>
          </select>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
          >
            {t(i18nKeys.platform.tenants.form.submitCreate)}
          </button>
        </div>
      </div>

      {formVisible && (
        <form
          onSubmit={handleSubmit}
          className="bg-card text-card-foreground rounded-xl border shadow p-6 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        >
          <div className="col-span-full">
            <h2 className="text-lg font-semibold">
              {formMode === 'create'
                ? t(i18nKeys.platform.tenants.form.createTitle)
                : t(i18nKeys.platform.tenants.form.editTitle)}
            </h2>
          </div>

          <div className="space-y-2">
            <label htmlFor="tenant-name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t(i18nKeys.platform.tenants.form.name)}
            </label>
            <input
              id="tenant-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tenant-slug" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t(i18nKeys.platform.tenants.form.slug)}
            </label>
            <input
              id="tenant-slug"
              type="text"
              value={slug}
              onChange={(event) =>
                setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
              }
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tenant-schoolCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t(i18nKeys.platform.tenants.form.schoolCode)}
            </label>
            <input
              id="tenant-schoolCode"
              type="text"
              value={schoolCode}
              onChange={(event) => setSchoolCode(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {formMode === 'create' && (
            <>
              <div className="space-y-2">
                <label htmlFor="tenant-adminEmail" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t(i18nKeys.platform.tenants.form.adminEmail)}
                </label>
                <input
                  id="tenant-adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tenant-adminName" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t(i18nKeys.platform.tenants.form.adminName)}
                </label>
                <input
                  id="tenant-adminName"
                  type="text"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="tenant-adminPassword" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t(i18nKeys.platform.tenants.form.adminPassword)}
                </label>
                <input
                  id="tenant-adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </>
          )}

          <div className="col-span-full flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setFormVisible(false);
                resetForm();
              }}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              {t(i18nKeys.common.cancel)}
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              {formMode === 'create'
                ? t(i18nKeys.platform.tenants.form.submitCreate)
                : t(i18nKeys.platform.tenants.form.submitEdit)}
            </button>
          </div>

          {generatedPassword && (
            <div className="col-span-full mt-2 text-sm text-green-600 dark:text-green-400 font-medium p-3 bg-green-50 dark:bg-green-900/10 rounded-md border border-green-200 dark:border-green-900">
              <strong>{t(i18nKeys.platform.tenants.form.initialPasswordGenerated)}</strong> {generatedPassword}
            </div>
          )}
        </form>
      )}

      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8 text-muted-foreground">{t(i18nKeys.common.loading)}</div>
      ) : tenants.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t(i18nKeys.platform.tenants.empty)}</p>
      ) : (
        <div className="rounded-md border bg-card text-card-foreground">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.name)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.slug)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.schoolCode)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.status)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.createdAt)}
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">
                    {t(i18nKeys.platform.tenants.table.actions)}
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{tenant.name}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{tenant.slug}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{tenant.schoolCode}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${tenant.status === 'ACTIVE'
                        ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-900/50'
                        : tenant.status === 'SUSPENDED'
                          ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-900/50'
                          : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
                        }`}>
                        {statusLabel(tenant.status)}
                      </span>
                    </td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{formatDate(tenant.createdAt)}</td>
                    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => openEditForm(tenant)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-7 px-3"
                        >
                          {t(i18nKeys.platform.tenants.form.submitEdit)}
                        </button>
                        {tenant.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(tenant.id, 'ACTIVE')}
                            disabled={actionId === tenant.id}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-green-100 text-green-900 shadow-sm hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 h-7 px-3"
                          >
                            {t(i18nKeys.platform.tenants.status.active)}
                          </button>
                        )}
                        {tenant.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(tenant.id, 'SUSPENDED')}
                            disabled={actionId === tenant.id}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-100 text-red-900 shadow-sm hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 h-7 px-3"
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
        </div>
      )}
    </section>
  );
}
