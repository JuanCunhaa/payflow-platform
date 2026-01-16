'use client';

import { useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type GuardianStudent = {
  id: string;
  name: string;
  status: string;
  class: {
    id: string;
    name: string;
  };
};

type StudentsResponse = {
  items: GuardianStudent[];
};

export default function GuardianStudentsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [students, setStudents] = useState<GuardianStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch('/guardian/students');
        if (!res.ok) {
          setError(t(i18nKeys.common.error));
          return;
        }

        const data = (await res.json()) as StudentsResponse;
        if (!cancelled) {
          setStudents(data.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.common.error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, t]);

  return (
    <section
      style={{
        maxWidth: '800px',
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
        {t(i18nKeys.guardian.pages.students.title)}
      </h1>
      <p
        style={{
          margin: 0,
          marginBottom: '16px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        {t(i18nKeys.guardian.pages.students.description)}
      </p>

      {loading ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.common.loading)}
        </p>
      ) : error ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#b91c1c',
          }}
        >
          {error}
        </p>
      ) : students.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.school.studentsUi.empty)}
        </p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.school.studentsUi.table.name)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.school.studentsUi.table.class)}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontWeight: 500,
                  color: '#475569',
                }}
              >
                {t(i18nKeys.school.studentsUi.table.status)}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {student.name}
                </td>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {student.class.name}
                </td>
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {student.status === 'ACTIVE'
                    ? t(i18nKeys.school.studentsUi.status.active)
                    : t(i18nKeys.school.studentsUi.status.inactive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
