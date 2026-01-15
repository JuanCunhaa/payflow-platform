'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type Grade = {
  id: string;
  name: string;
};

type ClassItem = {
  id: string;
  name: string;
  gradeId: string;
};

type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type ActiveTab = 'grades' | 'classes';

export default function SchoolClassesPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('grades');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(true);
  const [gradesError, setGradesError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [selectedGradeId, setSelectedGradeId] = useState<string>('');

  const [gradeFormMode, setGradeFormMode] = useState<'create' | 'edit' | null>(null);
  const [gradeFormName, setGradeFormName] = useState('');
  const [gradeEditingId, setGradeEditingId] = useState<string | null>(null);
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeDeleteCandidateId, setGradeDeleteCandidateId] = useState<string | null>(null);

  const [classFormMode, setClassFormMode] = useState<'create' | 'edit' | null>(null);
  const [classFormName, setClassFormName] = useState('');
  const [classFormGradeId, setClassFormGradeId] = useState('');
  const [classEditingId, setClassEditingId] = useState<string | null>(null);
  const [classSaving, setClassSaving] = useState(false);
  const [classDeleteCandidateId, setClassDeleteCandidateId] = useState<string | null>(null);

  const loadGrades = useCallback(async () => {
    setGradesLoading(true);
    setGradesError(null);

    try {
      const res = await apiFetch('/school/grades?page=1&pageSize=100');
      if (!res.ok) {
        setGradesError(t(i18nKeys.school.classesUi.feedback.loadError));
        return;
      }
      const data = (await res.json()) as PagedResponse<Grade>;
      setGrades(data.items);

      if (!selectedGradeId && data.items.length > 0) {
        setSelectedGradeId(data.items[0].id);
      }
    } catch {
      setGradesError(t(i18nKeys.school.classesUi.feedback.loadError));
    } finally {
      setGradesLoading(false);
    }
  }, [apiFetch, selectedGradeId, t]);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '100');
      const currentGradeId = selectedGradeId || '';
      if (currentGradeId) params.set('gradeId', currentGradeId);

      const res = await apiFetch(`/school/classes?${params.toString()}`);
      if (!res.ok) {
        setClassesError(t(i18nKeys.school.classesUi.feedback.loadError));
        return;
      }
      const data = (await res.json()) as PagedResponse<ClassItem>;
      setClasses(data.items);
    } catch {
      setClassesError(t(i18nKeys.school.classesUi.feedback.loadError));
    } finally {
      setClassesLoading(false);
    }
  }, [apiFetch, selectedGradeId, t]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  function resetGradeForm() {
    setGradeFormMode(null);
    setGradeFormName('');
    setGradeEditingId(null);
  }

  function openCreateGrade() {
    setGradeFormMode('create');
    setGradeFormName('');
    setGradeEditingId(null);
    setGradeDeleteCandidateId(null);
  }

  function openEditGrade(grade: Grade) {
    setGradeFormMode('edit');
    setGradeFormName(grade.name);
    setGradeEditingId(grade.id);
    setGradeDeleteCandidateId(null);
  }

  async function handleSubmitGrade(event: FormEvent) {
    event.preventDefault();
    if (!gradeFormMode) return;

    const name = gradeFormName.trim();
    if (!name) {
      setGradesError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    setGradeSaving(true);
    setGradesError(null);

    try {
      if (gradeFormMode === 'create') {
        const res = await apiFetch('/school/grades', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          setGradesError(t(i18nKeys.school.classesUi.feedback.saveError));
          return;
        }
      } else if (gradeFormMode === 'edit' && gradeEditingId) {
        const res = await apiFetch(`/school/grades/${gradeEditingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          setGradesError(t(i18nKeys.school.classesUi.feedback.saveError));
          return;
        }
      }

      resetGradeForm();
      await loadGrades();
    } catch {
      setGradesError(t(i18nKeys.school.classesUi.feedback.saveError));
    } finally {
      setGradeSaving(false);
    }
  }

  async function handleDeleteGrade(id: string) {
    setGradesError(null);
    try {
      const res = await apiFetch(`/school/grades/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setGradesError(t(i18nKeys.school.classesUi.feedback.deleteError));
        return;
      }
      setGradeDeleteCandidateId(null);
      await loadGrades();
      await loadClasses();
    } catch {
      setGradesError(t(i18nKeys.school.classesUi.feedback.deleteError));
    }
  }

  function resetClassForm() {
    setClassFormMode(null);
    setClassFormName('');
    setClassFormGradeId('');
    setClassEditingId(null);
  }

  function openCreateClass() {
    setClassFormMode('create');
    setClassFormName('');
    setClassFormGradeId(selectedGradeId || (grades[0]?.id ?? ''));
    setClassEditingId(null);
    setClassDeleteCandidateId(null);
  }

  function openEditClass(item: ClassItem) {
    setClassFormMode('edit');
    setClassFormName(item.name);
    setClassFormGradeId(item.gradeId);
    setClassEditingId(item.id);
    setClassDeleteCandidateId(null);
  }

  async function handleSubmitClass(event: FormEvent) {
    event.preventDefault();
    if (!classFormMode) return;

    const name = classFormName.trim();
    if (!name || !classFormGradeId) {
      setClassesError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    setClassSaving(true);
    setClassesError(null);

    try {
      if (classFormMode === 'create') {
        const res = await apiFetch('/school/classes', {
          method: 'POST',
          body: JSON.stringify({ name, gradeId: classFormGradeId }),
        });
        if (!res.ok) {
          setClassesError(t(i18nKeys.school.classesUi.feedback.saveError));
          return;
        }
      } else if (classFormMode === 'edit' && classEditingId) {
        const res = await apiFetch(`/school/classes/${classEditingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, gradeId: classFormGradeId }),
        });
        if (!res.ok) {
          setClassesError(t(i18nKeys.school.classesUi.feedback.saveError));
          return;
        }
      }

      resetClassForm();
      await loadClasses();
    } catch {
      setClassesError(t(i18nKeys.school.classesUi.feedback.saveError));
    } finally {
      setClassSaving(false);
    }
  }

  async function handleDeleteClass(id: string) {
    setClassesError(null);
    try {
      const res = await apiFetch(`/school/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setClassesError(t(i18nKeys.school.classesUi.feedback.deleteError));
        return;
      }
      setClassDeleteCandidateId(null);
      await loadClasses();
    } catch {
      setClassesError(t(i18nKeys.school.classesUi.feedback.deleteError));
    }
  }

  function gradeNameById(id: string): string {
    return grades.find((g) => g.id === id)?.name ?? '';
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
        {t(i18nKeys.school.pages.classes.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '16px',
        }}
      >
        {t(i18nKeys.school.pages.classes.description)}
      </p>

      <div
        style={{
          display: 'inline-flex',
          borderRadius: '999px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          style={{
            padding: '6px 14px',
            border: 'none',
            backgroundColor: activeTab === 'grades' ? '#0f172a' : 'transparent',
            color: activeTab === 'grades' ? '#f9fafb' : '#4b5563',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {t(i18nKeys.school.classesUi.tabs.grades)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          style={{
            padding: '6px 14px',
            border: 'none',
            backgroundColor: activeTab === 'classes' ? '#0f172a' : 'transparent',
            color: activeTab === 'classes' ? '#f9fafb' : '#4b5563',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          {t(i18nKeys.school.classesUi.tabs.classes)}
        </button>
      </div>

      {activeTab === 'grades' && (
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
              }}
            >
              {t(i18nKeys.school.classesUi.grades.title)}
            </h2>
            {gradeFormMode ? (
              <button
                type="button"
                onClick={resetGradeForm}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t(i18nKeys.school.classesUi.form.cancel)}
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateGrade}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {t(i18nKeys.school.classesUi.grades.create)}
              </button>
            )}
          </div>

          {gradesError && (
            <p
              style={{
                marginBottom: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              {gradesError}
            </p>
          )}

          {gradeFormMode && (
            <form
              onSubmit={handleSubmitGrade}
              style={{
                marginBottom: '12px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <label
                htmlFor="grade-name-input"
                style={{
                  fontSize: '13px',
                  color: '#374151',
                }}
              >
                {t(i18nKeys.school.classesUi.form.gradeName)}
              </label>
              <input
                id="grade-name-input"
                type="text"
                value={gradeFormName}
                onChange={(event) => setGradeFormName(event.target.value)}
                style={{
                  flex: '1 1 160px',
                  minWidth: '160px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                disabled={gradeSaving}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: gradeSaving ? 'not-allowed' : 'pointer',
                  opacity: gradeSaving ? 0.7 : 1,
                }}
              >
                {gradeSaving
                  ? t(i18nKeys.common.loading)
                  : t(i18nKeys.school.classesUi.form.save)}
              </button>
            </form>
          )}

          {gradesLoading ? (
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.common.loading)}
            </p>
          ) : grades.length === 0 ? (
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.school.classesUi.grades.empty)}
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
              }}
            >
              {grades.map((grade) => (
                <li
                  key={grade.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span>{grade.name}</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {gradeDeleteCandidateId === grade.id ? (
                      <>
                        <span>{t(i18nKeys.school.classesUi.grades.deleteConfirmTitle)}</span>
                        <button
                          type="button"
                          onClick={() => setGradeDeleteCandidateId(null)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.form.cancel)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteGrade(grade.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.grades.delete)}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditGrade(grade)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.grades.edit)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGradeDeleteCandidateId(grade.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.grades.delete)}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'classes' && (
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
              }}
            >
              {t(i18nKeys.school.classesUi.classes.title)}
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              <label
                htmlFor="classes-filter-grade"
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                }}
              >
                {t(i18nKeys.school.classesUi.classes.filterByGrade)}
              </label>
              <select
                id="classes-filter-grade"
                value={selectedGradeId}
                onChange={(event) => setSelectedGradeId(event.target.value)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '13px',
                  minWidth: '160px',
                }}
              >
                <option value="">
                  {t(i18nKeys.school.classesUi.classes.filterByGrade)}
                </option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
              {classFormMode ? (
                <button
                  type="button"
                  onClick={resetClassForm}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '999px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#ffffff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t(i18nKeys.school.classesUi.form.cancel)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateClass}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {t(i18nKeys.school.classesUi.classes.create)}
                </button>
              )}
            </div>
          </div>

          {classesError && (
            <p
              style={{
                marginBottom: '8px',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              {classesError}
            </p>
          )}

          {classFormMode && (
            <form
              onSubmit={handleSubmitClass}
              style={{
                marginBottom: '12px',
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <label
                htmlFor="class-name-input"
                style={{
                  fontSize: '13px',
                  color: '#374151',
                }}
              >
                {t(i18nKeys.school.classesUi.form.className)}
              </label>
              <input
                id="class-name-input"
                type="text"
                value={classFormName}
                onChange={(event) => setClassFormName(event.target.value)}
                style={{
                  flex: '1 1 160px',
                  minWidth: '140px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              />
              <select
                value={classFormGradeId}
                onChange={(event) => setClassFormGradeId(event.target.value)}
                style={{
                  flex: '1 1 160px',
                  minWidth: '140px',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                }}
              >
                <option value="">
                  {t(i18nKeys.school.classesUi.form.classGrade)}
                </option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={classSaving}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  fontSize: '13px',
                  cursor: classSaving ? 'not-allowed' : 'pointer',
                  opacity: classSaving ? 0.7 : 1,
                }}
              >
                {classSaving
                  ? t(i18nKeys.common.loading)
                  : t(i18nKeys.school.classesUi.form.save)}
              </button>
            </form>
          )}

          {classesLoading ? (
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.common.loading)}
            </p>
          ) : classes.length === 0 ? (
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
              }}
            >
              {t(i18nKeys.school.classesUi.classes.empty)}
            </p>
          ) : (
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
              }}
            >
              {classes.map((item) => (
                <li
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <div>
                    <div>{item.name}</div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      {gradeNameById(item.gradeId)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                    }}
                  >
                    {classDeleteCandidateId === item.id ? (
                      <>
                        <span>{t(i18nKeys.school.classesUi.grades.deleteConfirmTitle)}</span>
                        <button
                          type="button"
                          onClick={() => setClassDeleteCandidateId(null)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.form.cancel)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteClass(item.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.classes.delete)}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditClass(item)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #e5e7eb',
                            backgroundColor: '#ffffff',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.classes.edit)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassDeleteCandidateId(item.id)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '999px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            cursor: 'pointer',
                          }}
                        >
                          {t(i18nKeys.school.classesUi.classes.delete)}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
