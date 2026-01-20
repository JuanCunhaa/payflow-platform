'use client';

import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type GuardianStatus = 'ACTIVE' | 'INACTIVE';

type Guardian = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  status: GuardianStatus;
  user?: { email: string };
  studentIds?: string[];
};

type Student = {
  id: string;
  name: string;
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FilterStatus = 'ALL' | GuardianStatus;

export default function SchoolGuardiansPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(true);
  const [guardiansError, setGuardiansError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<GuardianStatus>('ACTIVE');
  const [saving, setSaving] = useState(false);

  const [selectedGuardianId, setSelectedGuardianId] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const loadGuardians = useCallback(async () => {
    setGuardiansLoading(true);
    setGuardiansError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      if (filterStatus !== 'ALL') {
        params.set('status', filterStatus);
      }

      const q = searchQuery.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/school/guardians?${params.toString()}`);
      if (!res.ok) {
        setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.loadError));
        setGuardians([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<Guardian>;
      setGuardians(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch {
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.loadError));
      setGuardians([]);
    } finally {
      setGuardiansLoading(false);
    }
  }, [apiFetch, filterStatus, page, pageSize, searchQuery, t]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');

      const res = await apiFetch(`/school/students?${params.toString()}`);
      if (!res.ok) {
        setStudents([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<{ id: string; name: string }>;
      setStudents(data.items.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void loadGuardians();
  }, [loadGuardians]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function openCreateGuardian() {
    setFormMode('create');
    setEditingGuardianId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('ACTIVE');
    setGuardiansError(null);
  }

  function openEditGuardian(guardian: Guardian) {
    setFormMode('edit');
    setEditingGuardianId(guardian.id);
    setFormName(guardian.name);
    setFormEmail(guardian.user?.email ?? '');
    setFormPhone(guardian.phone);
    setFormStatus(guardian.status);
    setGuardiansError(null);
  }

  function resetForm() {
    setFormMode(null);
    setEditingGuardianId(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('ACTIVE');
  }

  async function handleSubmitGuardian(event: FormEvent) {
    event.preventDefault();
    if (!formMode) return;

    const name = formName.trim();
    const email = formEmail.trim();
    const phone = formPhone.trim();

    if (!name || !email || !phone) {
      setGuardiansError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    setSaving(true);
    setGuardiansError(null);

    try {
      if (formMode === 'create') {
        const res = await apiFetch('/school/guardians', {
          method: 'POST',
          body: JSON.stringify({
            name,
            phone,
            userEmail: email,
            status: formStatus,
          }),
        });
        if (!res.ok) {
          setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.saveError));
          return;
        }
      } else if (formMode === 'edit' && editingGuardianId) {
        const res = await apiFetch(`/school/guardians/${editingGuardianId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name,
            phone,
            status: formStatus,
          }),
        });
        if (!res.ok) {
          setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.saveError));
          return;
        }
      }

      resetForm();
      await loadGuardians();
    } catch {
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(guardian: Guardian) {
    const nextStatus: GuardianStatus = guardian.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await apiFetch(`/school/guardians/${guardian.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.saveError));
        return;
      }
      await loadGuardians();
    } catch {
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.saveError));
    }
  }

  function getSelectedGuardian(): Guardian | undefined {
    if (!selectedGuardianId) return undefined;
    return guardians.find((g) => g.id === selectedGuardianId);
  }

  function handleFilterStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setFilterStatus(event.target.value as FilterStatus);
    setPage(1);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
    setPage(1);
  }

  function handlePrevPage() {
    if (page > 1) setPage(page - 1);
  }

  function handleNextPage() {
    if (page < totalPages) setPage(page + 1);
  }

  async function handleLinkStudent(event: FormEvent) {
    event.preventDefault();
    const guardian = getSelectedGuardian();
    if (!guardian || !linkStudentId) return;

    setLinking(true);
    try {
      const res = await apiFetch(`/school/guardians/${guardian.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId: linkStudentId }),
      });
      if (!res.ok) {
        setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.linkError));
        return;
      }
      setLinkStudentId('');
      await loadGuardians();
    } catch {
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.linkError));
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkStudent(studentId: string) {
    const guardian = getSelectedGuardian();
    if (!guardian) return;

    setUnlinkingId(studentId);
    try {
      const res = await apiFetch(`/school/guardians/${guardian.id}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.unlinkError));
        return;
      }
      await loadGuardians();
    } catch {
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.unlinkError));
    } finally {
      setUnlinkingId(null);
    }
  }

  const selectedGuardian = getSelectedGuardian();
  const linkedStudents =
    selectedGuardian?.studentIds
      ?.map((id) => students.find((s) => s.id === id))
      .filter((s): s is Student => Boolean(s)) ?? [];

  const availableStudents = students.filter(
    (student) => !selectedGuardian?.studentIds?.includes(student.id)
  );

  return (
    <div>
      <header>
        <h1>{t(i18nKeys.school.pages.guardians.title)}</h1>
        <p>{t(i18nKeys.school.pages.guardians.description)}</p>
      </header>

      {guardiansError && <p>{guardiansError}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void loadGuardians();
        }}
      >
        <label>
          {t(i18nKeys.school.guardiansUi.filters.status)}
          <select value={filterStatus} onChange={handleFilterStatusChange}>
            <option value="ALL">
              {t(i18nKeys.school.guardiansUi.filters.statusAll)}
            </option>
            <option value="ACTIVE">
              {t(i18nKeys.school.guardiansUi.status.active)}
            </option>
            <option value="INACTIVE">
              {t(i18nKeys.school.guardiansUi.status.inactive)}
            </option>
          </select>
        </label>

        <label>
          {t(i18nKeys.school.guardiansUi.filters.search)}
          <input type="text" value={searchQuery} onChange={handleSearchChange} />
        </label>

        <button type="submit">{t(i18nKeys.common.loading)}</button>

        <button type="button" onClick={openCreateGuardian}>
          {t(i18nKeys.school.guardiansUi.actions.create)}
        </button>
      </form>

      {formMode && (
        <form onSubmit={handleSubmitGuardian}>
          <label>
            {t(i18nKeys.school.guardiansUi.table.name)}
            <input
              type="text"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
          </label>

          <label>
            {t(i18nKeys.school.guardiansUi.table.email)}
            <input
              type="email"
              value={formEmail}
              onChange={(event) => setFormEmail(event.target.value)}
            />
          </label>

          <label>
            {t(i18nKeys.school.guardiansUi.table.phone)}
            <input
              type="text"
              value={formPhone}
              onChange={(event) => setFormPhone(event.target.value)}
            />
          </label>

          <label>
            {t(i18nKeys.school.guardiansUi.table.status)}
            <select
              value={formStatus}
              onChange={(event) => setFormStatus(event.target.value as GuardianStatus)}
            >
              <option value="ACTIVE">
                {t(i18nKeys.school.guardiansUi.status.active)}
              </option>
              <option value="INACTIVE">
                {t(i18nKeys.school.guardiansUi.status.inactive)}
              </option>
            </select>
          </label>

          <button type="button" onClick={resetForm}>
            {t(i18nKeys.common.cancel)}
          </button>
          <button type="submit" disabled={saving}>
            {saving
              ? t(i18nKeys.common.loading)
              : formMode === 'create'
                ? t(i18nKeys.school.guardiansUi.actions.create)
                : t(i18nKeys.school.guardiansUi.actions.edit)}
          </button>
        </form>
      )}

      {guardiansLoading ? (
        <p>{t(i18nKeys.common.loading)}</p>
      ) : guardians.length === 0 ? (
        <p>{t(i18nKeys.school.guardiansUi.empty)}</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>{t(i18nKeys.school.guardiansUi.table.name)}</th>
                <th>{t(i18nKeys.school.guardiansUi.table.email)}</th>
                <th>{t(i18nKeys.school.guardiansUi.table.phone)}</th>
                <th>{t(i18nKeys.school.guardiansUi.table.status)}</th>
                <th>{t(i18nKeys.school.guardiansUi.table.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {guardians.map((guardian) => (
                <tr key={guardian.id}>
                  <td onClick={() => setSelectedGuardianId(guardian.id)}>{guardian.name}</td>
                  <td>{guardian.user?.email ?? ''}</td>
                  <td>{guardian.phone}</td>
                  <td>
                    {guardian.status === 'ACTIVE'
                      ? t(i18nKeys.school.guardiansUi.status.active)
                      : t(i18nKeys.school.guardiansUi.status.inactive)}
                  </td>
                  <td>
                    <Link
                      href={`/${locale || 'pt-BR'}/s/guardians/${guardian.id}`}
                      style={{
                        marginRight: '8px',
                      }}
                    >
                      {t(i18nKeys.school.reportsUi.guardian.title)}
                    </Link>
                    <button type="button" onClick={() => openEditGuardian(guardian)}>
                      {t(i18nKeys.school.guardiansUi.actions.edit)}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(guardian)}
                    >
                      {guardian.status === 'ACTIVE'
                        ? t(i18nKeys.school.guardiansUi.actions.inactivate)
                        : t(i18nKeys.school.guardiansUi.actions.activate)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGuardianId(guardian.id)}
                    >
                      {t(i18nKeys.school.guardiansUi.actions.viewDetails)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <span>
              {page} / {totalPages}
            </span>
            <button type="button" onClick={handlePrevPage} disabled={page <= 1}>
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= totalPages}
            >
              ›
            </button>
          </div>
        </>
      )}

      <section>
        <h2>{t(i18nKeys.school.guardiansUi.detail.title)}</h2>

        {!selectedGuardian ? (
          <p>{t(i18nKeys.school.guardiansUi.empty)}</p>
        ) : (
          <>
            <h3>{t(i18nKeys.school.guardiansUi.detail.infoTitle)}</h3>
            <p>{selectedGuardian.name}</p>
            <p>{selectedGuardian.user?.email}</p>
            <p>
              {selectedGuardian.phone} •{' '}
              {selectedGuardian.status === 'ACTIVE'
                ? t(i18nKeys.school.guardiansUi.status.active)
                : t(i18nKeys.school.guardiansUi.status.inactive)}
            </p>

            <h3>{t(i18nKeys.school.guardiansUi.detail.studentsTitle)}</h3>
            {studentsLoading ? (
              <p>{t(i18nKeys.common.loading)}</p>
            ) : linkedStudents.length === 0 ? (
              <p>{t(i18nKeys.school.guardiansUi.detail.studentsEmpty)}</p>
            ) : (
              <ul>
                {linkedStudents.map((student) => (
                  <li key={student.id}>
                    {student.name}{' '}
                    <button
                      type="button"
                      onClick={() => void handleUnlinkStudent(student.id)}
                      disabled={unlinkingId === student.id}
                    >
                      {t(i18nKeys.school.guardiansUi.actions.unlinkStudent)}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {availableStudents.length > 0 && (
              <form onSubmit={handleLinkStudent}>
                <label>
                  {t(i18nKeys.school.guardiansUi.actions.linkStudent)}
                  <select
                    value={linkStudentId}
                    onChange={(event) => setLinkStudentId(event.target.value)}
                  >
                    <option value="">
                      {t(i18nKeys.school.guardiansUi.actions.linkStudent)}
                    </option>
                    {availableStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={linking || !linkStudentId}>
                  {linking
                    ? t(i18nKeys.common.loading)
                    : t(i18nKeys.school.guardiansUi.actions.linkStudent)}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
