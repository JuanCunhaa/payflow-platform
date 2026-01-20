'use client';

import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type ClassItem = {
  id: string;
  name: string;
};

type StudentStatus = 'ACTIVE' | 'INACTIVE';

type Student = {
  id: string;
  name: string;
  classId: string;
  status: StudentStatus;
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type FilterStatus = 'ALL' | StudentStatus;

export default function SchoolStudentsPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState<boolean>(true);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [filterClassId, setFilterClassId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formClassId, setFormClassId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<StudentStatus>('ACTIVE');
  const [saving, setSaving] = useState<boolean>(false);

  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [importing, setImporting] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await apiFetch('/school/classes?page=1&pageSize=100');
      if (!res.ok) {
        setClasses([]);
        return;
      }
      const data = (await res.json()) as PagedResponse<ClassItem>;
      setClasses(data.items);
    } catch {
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, [apiFetch]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(pageSize));

      if (filterClassId) params.set('classId', filterClassId);
      if (filterStatus !== 'ALL') params.set('status', filterStatus);

      const q = searchQuery.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/school/students?${params.toString()}`);
      if (!res.ok) {
        setStudentsError(t(i18nKeys.school.studentsUi.feedback.loadError));
        setStudents([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<Student>;
      setStudents(data.items);
      setPage(data.page);
      setPageSize(data.pageSize);
      setTotalPages(data.totalPages);
    } catch {
      setStudentsError(t(i18nKeys.school.studentsUi.feedback.loadError));
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [apiFetch, filterClassId, filterStatus, page, pageSize, searchQuery, t]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  function resetForm() {
    setFormMode(null);
    setEditingStudentId(null);
    setFormName('');
    setFormClassId('');
    setFormStatus('ACTIVE');
  }

  function openCreateStudent() {
    setFormMode('create');
    setEditingStudentId(null);
    setFormName('');
    setFormClassId(classes[0]?.id ?? '');
    setFormStatus('ACTIVE');
    setStudentsError(null);
  }

  function openEditStudent(student: Student) {
    setFormMode('edit');
    setEditingStudentId(student.id);
    setFormName(student.name);
    setFormClassId(student.classId);
    setFormStatus(student.status);
    setStudentsError(null);
  }

  async function handleSubmitStudent(event: FormEvent) {
    event.preventDefault();
    if (!formMode) return;

    const name = formName.trim();
    const classId = formClassId;
    if (!name || !classId) {
      setStudentsError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    setSaving(true);
    setStudentsError(null);

    try {
      if (formMode === 'create') {
        const res = await apiFetch('/school/students', {
          method: 'POST',
          body: JSON.stringify({ name, classId, status: formStatus }),
        });
        if (!res.ok) {
          setStudentsError(t(i18nKeys.school.studentsUi.feedback.saveError));
          return;
        }
      } else if (formMode === 'edit' && editingStudentId) {
        const res = await apiFetch(`/school/students/${editingStudentId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, classId, status: formStatus }),
        });
        if (!res.ok) {
          setStudentsError(t(i18nKeys.school.studentsUi.feedback.saveError));
          return;
        }
      }

      resetForm();
      await loadStudents();
    } catch {
      setStudentsError(t(i18nKeys.school.studentsUi.feedback.saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteStudent(id: string) {
    setDeleteLoading(true);
    setStudentsError(null);

    try {
      const res = await apiFetch(`/school/students/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setStudentsError(t(i18nKeys.school.studentsUi.feedback.deleteError));
        return;
      }

      setDeleteCandidateId(null);
      await loadStudents();
    } catch {
      setStudentsError(t(i18nKeys.school.studentsUi.feedback.deleteError));
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggleStatus(student: Student) {
    const nextStatus: StudentStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStudentsError(null);

    try {
      const res = await apiFetch(`/school/students/${student.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        setStudentsError(t(i18nKeys.school.studentsUi.feedback.saveError));
        return;
      }
      await loadStudents();
    } catch {
      setStudentsError(t(i18nKeys.school.studentsUi.feedback.saveError));
    }
  }

  function getClassNameById(id: string) {
    const found = classes.find((item) => item.id === id);
    return found?.name ?? '';
  }

  function handleFilterClassChange(event: ChangeEvent<HTMLSelectElement>) {
    setFilterClassId(event.target.value);
    setPage(1);
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

  function handleClickImportButton() {
    setImportError(null);
    setImportSuccess(null);
    fileInputRef.current?.click();
  }

  async function importStudentsFromCsv(file: File) {
    setImporting(true);
    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        setImportError(t(i18nKeys.school.studentsUi.feedback.importError));
        return;
      }

      const headers = lines[0]
        .split(',')
        .map((header) => header.trim().toLowerCase());

      const findColumnIndex = (candidates: string[]): number => {
        for (const candidate of candidates) {
          const index = headers.indexOf(candidate.toLowerCase());
          if (index !== -1) return index;
        }
        return -1;
      };

      const nameIndex = findColumnIndex(['name', 'nome', 'student_name']);
      const classIndex = findColumnIndex(['class', 'turma', 'class_name']);
      const statusIndex = findColumnIndex(['status', 'situacao']);

      if (nameIndex === -1 || classIndex === -1) {
        setImportError(t(i18nKeys.school.studentsUi.feedback.importError));
        return;
      }

      let successCount = 0;

      for (let i = 1; i < lines.length; i += 1) {
        const parts = lines[i].split(',');
        const rawName = parts[nameIndex]?.trim() ?? '';
        const rawClass = parts[classIndex]?.trim() ?? '';
        const rawStatus = statusIndex >= 0 ? parts[statusIndex]?.trim() ?? '' : '';

        if (!rawName || !rawClass) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const classLower = rawClass.toLowerCase();
        const classEntity =
          classes.find((item) => item.id === rawClass) ||
          classes.find((item) => item.name.toLowerCase() === classLower);

        if (!classEntity) {
          // eslint-disable-next-line no-continue
          continue;
        }

        let status: StudentStatus = 'ACTIVE';
        if (rawStatus) {
          const normalized = rawStatus.toUpperCase();
          if (normalized === 'INACTIVE' || normalized === 'INATIVO' || normalized === 'INATIVA') {
            status = 'INACTIVE';
          }
        }

        try {
          const res = await apiFetch('/school/students', {
            method: 'POST',
            body: JSON.stringify({
              name: rawName,
              classId: classEntity.id,
              status,
            }),
          });
          if (res.ok) {
            successCount += 1;
          }
        } catch {
          // ignore individual row errors
        }
      }

      if (successCount === 0) {
        setImportError(t(i18nKeys.school.studentsUi.feedback.importError));
      } else {
        setImportSuccess(t(i18nKeys.school.studentsUi.feedback.importSuccess));
        await loadStudents();
      }
    } catch {
      setImportError(t(i18nKeys.school.studentsUi.feedback.importError));
    } finally {
      setImporting(false);
    }
  }

  function handleCsvInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void importStudentsFromCsv(file);
    }
    // Reset input so the mesmo arquivo possa ser selecionado novamente
    // eslint-disable-next-line no-param-reassign
    event.target.value = '';
  }

  return (
    <section>
      <header>
        <h1>{t(i18nKeys.school.pages.students.title)}</h1>
        <p>{t(i18nKeys.school.pages.students.description)}</p>
      </header>

      {(studentsError || importError || importSuccess) && (
        <div>
          {studentsError && <div>{studentsError}</div>}
          {importError && <div>{importError}</div>}
          {importSuccess && <div>{importSuccess}</div>}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void loadStudents();
        }}
      >
        <label>
          {t(i18nKeys.school.studentsUi.filters.class)}
          <select
            value={filterClassId}
            onChange={handleFilterClassChange}
            disabled={classesLoading}
          >
            <option value="">
              {t(i18nKeys.school.studentsUi.filters.statusAll)}
            </option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          {t(i18nKeys.school.studentsUi.filters.status)}
          <select value={filterStatus} onChange={handleFilterStatusChange}>
            <option value="ALL">
              {t(i18nKeys.school.studentsUi.filters.statusAll)}
            </option>
            <option value="ACTIVE">
              {t(i18nKeys.school.studentsUi.status.active)}
            </option>
            <option value="INACTIVE">
              {t(i18nKeys.school.studentsUi.status.inactive)}
            </option>
          </select>
        </label>

        <label>
          {t(i18nKeys.school.studentsUi.filters.search)}
          <input type="text" value={searchQuery} onChange={handleSearchChange} />
        </label>

        <button type="submit">{t(i18nKeys.common.loading)}</button>

        <button type="button" onClick={openCreateStudent}>
          {t(i18nKeys.school.studentsUi.actions.create)}
        </button>

        <button
          type="button"
          onClick={handleClickImportButton}
          disabled={importing || classes.length === 0}
        >
          {importing
            ? t(i18nKeys.common.loading)
            : t(i18nKeys.school.studentsUi.actions.importCsv)}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvInputChange}
          style={{ display: 'none' }}
        />
      </form>

      {formMode && (
        <form onSubmit={handleSubmitStudent}>
          <label>
            {t(i18nKeys.school.studentsUi.table.name)}
            <input
              type="text"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
          </label>

          <label>
            {t(i18nKeys.school.studentsUi.filters.class)}
            <select
              value={formClassId}
              onChange={(event) => setFormClassId(event.target.value)}
            >
              <option value="">
                {t(i18nKeys.school.studentsUi.filters.class)}
              </option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t(i18nKeys.school.studentsUi.table.status)}
            <select
              value={formStatus}
              onChange={(event) => setFormStatus(event.target.value as StudentStatus)}
            >
              <option value="ACTIVE">
                {t(i18nKeys.school.studentsUi.status.active)}
              </option>
              <option value="INACTIVE">
                {t(i18nKeys.school.studentsUi.status.inactive)}
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
                ? t(i18nKeys.school.studentsUi.actions.create)
                : t(i18nKeys.school.studentsUi.actions.edit)}
          </button>
        </form>
      )}

      {studentsLoading ? (
        <p>{t(i18nKeys.common.loading)}</p>
      ) : students.length === 0 ? (
        <p>{t(i18nKeys.school.studentsUi.empty)}</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>{t(i18nKeys.school.studentsUi.table.name)}</th>
                <th>{t(i18nKeys.school.studentsUi.table.class)}</th>
                <th>{t(i18nKeys.school.studentsUi.table.status)}</th>
                <th>{t(i18nKeys.school.studentsUi.table.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{getClassNameById(student.classId)}</td>
                  <td>
                    {student.status === 'ACTIVE'
                      ? t(i18nKeys.school.studentsUi.status.active)
                      : t(i18nKeys.school.studentsUi.status.inactive)}
                  </td>
                  <td>
                    <Link
                      href={`/${locale || 'pt-BR'}/s/students/${student.id}`}
                      style={{
                        marginRight: '8px',
                      }}
                    >
                      {t(i18nKeys.school.reportsUi.student.title)}
                    </Link>
                    <button type="button" onClick={() => openEditStudent(student)}>
                      {t(i18nKeys.school.studentsUi.actions.edit)}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(student)}
                    >
                      {student.status === 'ACTIVE'
                        ? t(i18nKeys.school.studentsUi.actions.inactivate)
                        : t(i18nKeys.school.studentsUi.actions.activate)}
                    </button>
                    {deleteCandidateId === student.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidateId(null)}
                        >
                          {t(i18nKeys.common.cancel)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteStudent(student.id)}
                          disabled={deleteLoading}
                        >
                          {t(i18nKeys.school.studentsUi.actions.delete)}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteCandidateId(student.id)}
                      >
                        {t(i18nKeys.school.studentsUi.actions.delete)}
                      </button>
                    )}
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
    </section>
  );
}
