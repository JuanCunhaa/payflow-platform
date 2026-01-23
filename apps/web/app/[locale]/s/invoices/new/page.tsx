'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../../i18n-context';
import { useAuth } from '../../../../auth-context';

type Student = {
  id: string;
  name: string;
};

type Guardian = {
  id: string;
  name: string;
  studentIds?: string[];
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100);
}

export default function SchoolInvoiceNewPage() {
  const { t, locale } = useI18n();
  const { apiFetch } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [guardiansLoading, setGuardiansLoading] = useState(true);
  const [guardiansError, setGuardiansError] = useState<string | null>(null);

  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedGuardianId, setSelectedGuardianId] = useState('');

  const [amountInput, setAmountInput] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');
      const q = studentSearch.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/school/students?${params.toString()}`);
      if (!res.ok) {
        setStudents([]);
        setStudentsError(t(i18nKeys.school.studentsUi.feedback.loadError));
        return;
      }

      const data = (await res.json()) as PagedResponse<{ id: string; name: string }>;
      setStudents(data.items.map((s) => ({ id: s.id, name: s.name })));
    } catch {
      setStudents([]);
      setStudentsError(t(i18nKeys.school.studentsUi.feedback.loadError));
    } finally {
      setStudentsLoading(false);
    }
  }, [apiFetch, studentSearch, t]);

  const loadGuardians = useCallback(async () => {
    setGuardiansLoading(true);
    setGuardiansError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');

      const res = await apiFetch(`/school/guardians?${params.toString()}`);
      if (!res.ok) {
        setGuardians([]);
        setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.loadError));
        return;
      }

      const data = (await res.json()) as PagedResponse<Guardian>;
      setGuardians(data.items ?? []);
    } catch {
      setGuardians([]);
      setGuardiansError(t(i18nKeys.school.guardiansUi.feedback.loadError));
    } finally {
      setGuardiansLoading(false);
    }
  }, [apiFetch, t]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    void loadGuardians();
  }, [loadGuardians]);

  const suggestedGuardians = useMemo(() => {
    if (!selectedStudentId) return [];
    return guardians.filter((guardian) => guardian.studentIds?.includes(selectedStudentId));
  }, [guardians, selectedStudentId]);

  const canSubmit =
    !!selectedStudentId &&
    !!selectedGuardianId &&
    !!amountInput.trim() &&
    !!dueDate.trim() &&
    !!description.trim() &&
    !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const amountCents = parseCurrencyInput(amountInput);
    if (!amountCents) {
      setSubmitError(t(i18nKeys.school.invoicesUi.feedback.loadError));
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiFetch('/school/invoices/one-off', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudentId,
          guardianId: selectedGuardianId,
          amountCents,
          dueDate,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        setSubmitError(t(i18nKeys.school.invoicesUi.feedback.loadError));
        return;
      }

      const base = locale || 'pt-BR';
      // Para simplificar, redireciona para a listagem de cobranças
      router.push(`/${base}/s/invoices`);
    } catch {
      setSubmitError(t(i18nKeys.school.invoicesUi.feedback.loadError));
    } finally {
      setSubmitting(false);
    }
  }

  function handleStudentChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedStudentId(event.target.value);
    setSelectedGuardianId('');
  }

  return (
    <section
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: '8px',
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {t(i18nKeys.school.invoicesUi.newForm.title)}
      </h1>
      <p
        style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        {t(i18nKeys.school.invoicesUi.newForm.description)}
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '14px',
        }}
      >
        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span>{t(i18nKeys.school.invoicesUi.newForm.studentLabel)}</span>
          <input
            type="text"
            value={studentSearch}
            onChange={(event) => setStudentSearch(event.target.value)}
            placeholder={t(i18nKeys.school.studentsUi.filters.search)}
            style={{
              marginBottom: '4px',
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          />
          <select
            value={selectedStudentId}
            onChange={handleStudentChange}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <option value="">{t(i18nKeys.school.studentsUi.filters.statusAll)}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          {studentsLoading && (
            <span
              style={{
                fontSize: '12px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.common.loading)}
            </span>
          )}
          {studentsError && (
            <span
              style={{
                fontSize: '12px',
                color: '#b91c1c',
              }}
            >
              {studentsError}
            </span>
          )}
        </label>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span>{t(i18nKeys.school.invoicesUi.newForm.guardianLabel)}</span>
          <select
            value={selectedGuardianId}
            onChange={(event) => setSelectedGuardianId(event.target.value)}
            disabled={!selectedStudentId || guardiansLoading}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
            }}
          >
            <option value="">{t(i18nKeys.school.invoicesUi.newForm.guardianPlaceholder)}</option>
            {suggestedGuardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                {guardian.name}
              </option>
            ))}
          </select>
          {guardiansError && (
            <span
              style={{
                fontSize: '12px',
                color: '#b91c1c',
              }}
            >
              {guardiansError}
            </span>
          )}
        </label>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <label
            style={{
              flex: '1 1 150px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>{t(i18nKeys.school.invoicesUi.newForm.amountLabel)}</span>
            <input
              type="text"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="0,00"
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
              }}
            />
          </label>

          <label
            style={{
              flex: '1 1 150px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span>{t(i18nKeys.school.invoicesUi.newForm.dueDateLabel)}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
              }}
            />
          </label>
        </div>

        <label
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span>{t(i18nKeys.school.invoicesUi.newForm.descriptionLabel)}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            style={{
              padding: '6px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb',
              resize: 'vertical',
            }}
          />
        </label>

        {submitError && (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#b91c1c',
            }}
          >
            {submitError}
          </p>
        )}

        <div
          style={{
            marginTop: '8px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const base = locale || 'pt-BR';
              router.push(`/${base}/s/invoices`);
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t(i18nKeys.school.invoicesUi.newForm.cancel)}
          </button>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: canSubmit ? '#4f46e5' : '#9ca3af',
              color: '#ffffff',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontSize: '13px',
            }}
          >
            {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.school.invoicesUi.newForm.submit)}
          </button>
        </div>
      </form>
    </section>
  );
}
