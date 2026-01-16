'use client';

import type { MouseEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';

type GuardianStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';

type PendingGuardian = {
  id: string;
  name: string;
  phone: string;
  user: {
    email: string;
    emailVerified: boolean;
    status: GuardianStatus;
  };
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function SchoolGuardiansApprovalsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [guardians, setGuardians] = useState<PendingGuardian[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [actionGuardianId, setActionGuardianId] = useState<string | null>(null);

  const loadPendingGuardians = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      const res = await apiFetch(`/school/guardians/pending?${params.toString()}`);
      if (!res.ok) {
        setError(t(i18nKeys.school.guardiansUi.feedback.loadError));
        setGuardians([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<PendingGuardian>;
      setGuardians(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.loadError));
      setGuardians([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, pageSize, t]);

  useEffect(() => {
    void loadPendingGuardians();
  }, [loadPendingGuardians]);

  async function handleApprove(id: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setActionGuardianId(id);
    setError(null);

    try {
      const res = await apiFetch(`/school/guardians/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
        return;
      }
      await loadPendingGuardians();
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    } finally {
      setActionGuardianId(null);
    }
  }

  async function handleReject(id: string, event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setActionGuardianId(id);
    setError(null);

    try {
      const res = await apiFetch(`/school/guardians/${id}/reject`, {
        method: 'POST',
      });
      if (!res.ok) {
        setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
        return;
      }
      await loadPendingGuardians();
    } catch {
      setError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    } finally {
      setActionGuardianId(null);
    }
  }

  function handlePrevPage() {
    if (page > 1) {
      setPage(page - 1);
    }
  }

  function handleNextPage() {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }

  return (
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
          marginBottom: '4px',
        }}
      >
        {t(i18nKeys.school.pages.approvalsGuardians.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          marginTop: 0,
          marginBottom: '16px',
        }}
      >
        {t(i18nKeys.school.pages.approvalsGuardians.description)}
      </p>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #fee2e2',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
          }}
        >
          {t(i18nKeys.common.loading)}
        </p>
      ) : guardians.length === 0 ? (
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
            margin: 0,
          }}
        >
          {t(i18nKeys.school.guardiansUi.empty)}
        </p>
      ) : (
        <div
          style={{
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead
              style={{
                backgroundColor: '#f9fafb',
              }}
            >
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {t(i18nKeys.school.guardiansUi.table.name)}
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {t(i18nKeys.school.guardiansUi.table.email)}
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {t(i18nKeys.school.guardiansUi.table.phone)}
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {t(i18nKeys.school.guardiansUi.table.emailVerified)}
                </th>
                <th
                  style={{
                    textAlign: 'right',
                    padding: '8px 10px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {t(i18nKeys.school.guardiansUi.table.actions)}
                </th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {guardian.name}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {guardian.user.email}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {guardian.phone}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {guardian.user.emailVerified
                      ? t(i18nKeys.school.guardiansUi.status.active)
                      : t(i18nKeys.school.guardiansUi.status.inactive)}
                  </td>
                  <td
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={(event) => void handleApprove(guardian.id, event)}
                        disabled={actionGuardianId === guardian.id}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: '1px solid #22c55e',
                          backgroundColor:
                            actionGuardianId === guardian.id ? '#bbf7d0' : '#22c55e',
                          color: '#ffffff',
                          cursor: actionGuardianId === guardian.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {t(i18nKeys.school.guardiansUi.actions.activate)}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => void handleReject(guardian.id, event)}
                        disabled={actionGuardianId === guardian.id}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: '1px solid #fecaca',
                          backgroundColor:
                            actionGuardianId === guardian.id ? '#fecaca' : '#fef2f2',
                          color: '#b91c1c',
                          cursor: actionGuardianId === guardian.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {t(i18nKeys.school.guardiansUi.actions.inactivate)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              borderTop: '1px solid #e5e7eb',
              fontSize: '12px',
              color: '#6b7280',
            }}
          >
            <span>
              {page} / {totalPages}
            </span>
            <div
              style={{
                display: 'flex',
                gap: '6px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={page <= 1}
                style={{
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: page <= 1 ? '#f9fafb' : '#ffffff',
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
                  padding: '4px 8px',
                  borderRadius: '999px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: page >= totalPages ? '#f9fafb' : '#ffffff',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
