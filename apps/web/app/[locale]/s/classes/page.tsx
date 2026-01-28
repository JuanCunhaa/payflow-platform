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
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="mb-1 mt-0 text-xl font-semibold">{t(i18nKeys.school.pages.classes.title)}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        {t(i18nKeys.school.pages.classes.description)}
      </p>

      <div className="mb-4 inline-flex overflow-hidden rounded-full border">
        <button
          type="button"
          onClick={() => setActiveTab('grades')}
          className={`cursor-pointer border-none px-3.5 py-1.5 text-sm ${
            activeTab === 'grades'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-muted'
          }`}
        >
          {t(i18nKeys.school.classesUi.tabs.grades)}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`cursor-pointer border-none px-3.5 py-1.5 text-sm ${
            activeTab === 'classes'
              ? 'bg-primary text-primary-foreground'
              : 'bg-transparent text-muted-foreground hover:bg-muted'
          }`}
        >
          {t(i18nKeys.school.classesUi.tabs.classes)}
        </button>
      </div>

      {activeTab === 'grades' && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-base font-semibold">
              {t(i18nKeys.school.classesUi.grades.title)}
            </h2>
            {gradeFormMode ? (
              <button
                type="button"
                onClick={resetGradeForm}
                className="cursor-pointer rounded-full border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
              >
                {t(i18nKeys.school.classesUi.form.cancel)}
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateGrade}
                className="cursor-pointer rounded-full border-none bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
              >
                {t(i18nKeys.school.classesUi.grades.create)}
              </button>
            )}
          </div>

          {gradesError && (
            <p className="mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              {gradesError}
            </p>
          )}

          {gradeFormMode && (
            <form onSubmit={handleSubmitGrade} className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="grade-name-input" className="text-xs text-foreground">
                {t(i18nKeys.school.classesUi.form.gradeName)}
              </label>
              <input
                id="grade-name-input"
                type="text"
                value={gradeFormName}
                onChange={(event) => setGradeFormName(event.target.value)}
                className="w-40 min-w-[160px] flex-1 rounded-lg border bg-background px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                disabled={gradeSaving}
                className={`cursor-pointer rounded-full border-none bg-green-600 px-2.5 py-1.5 text-xs text-white hover:bg-green-700 ${
                  gradeSaving ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                {gradeSaving ? t(i18nKeys.common.loading) : t(i18nKeys.school.classesUi.form.save)}
              </button>
            </form>
          )}

          {gradesLoading ? (
            <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
          ) : grades.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(i18nKeys.school.classesUi.grades.empty)}
            </p>
          ) : (
            <ul className="m-0 list-none p-0">
              {grades.map((grade) => (
                <li
                  key={grade.id}
                  className="flex items-center justify-between border-b px-2.5 py-2 last:border-0"
                >
                  <span className="text-sm text-foreground">{grade.name}</span>
                  <div className="flex items-center gap-1.5 text-xs">
                    {gradeDeleteCandidateId === grade.id ? (
                      <>
                        <span className="text-muted-foreground">
                          {t(i18nKeys.school.classesUi.grades.deleteConfirmTitle)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setGradeDeleteCandidateId(null)}
                          className="cursor-pointer rounded-full border bg-background px-2 py-1 hover:bg-muted"
                        >
                          {t(i18nKeys.school.classesUi.form.cancel)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteGrade(grade.id)}
                          className="cursor-pointer rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
                        >
                          {t(i18nKeys.school.classesUi.grades.delete)}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditGrade(grade)}
                          className="cursor-pointer rounded-full border bg-background px-2 py-1 text-foreground hover:bg-muted"
                        >
                          {t(i18nKeys.school.classesUi.grades.edit)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setGradeDeleteCandidateId(grade.id)}
                          className="cursor-pointer rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="m-0 text-base font-semibold">
              {t(i18nKeys.school.classesUi.classes.title)}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="classes-filter-grade" className="text-xs text-muted-foreground">
                {t(i18nKeys.school.classesUi.classes.filterByGrade)}
              </label>
              <select
                id="classes-filter-grade"
                value={selectedGradeId}
                onChange={(event) => setSelectedGradeId(event.target.value)}
                className="min-w-[160px] rounded-lg border bg-background px-2 py-1.5 text-xs"
              >
                <option value="">{t(i18nKeys.school.classesUi.classes.filterByGrade)}</option>
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
                  className="cursor-pointer rounded-full border bg-background px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  {t(i18nKeys.school.classesUi.form.cancel)}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openCreateClass}
                  className="cursor-pointer rounded-full border-none bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
                >
                  {t(i18nKeys.school.classesUi.classes.create)}
                </button>
              )}
            </div>
          </div>

          {classesError && (
            <p className="mb-2 rounded-lg border border-destructive/50 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
              {classesError}
            </p>
          )}

          {classFormMode && (
            <form onSubmit={handleSubmitClass} className="mb-3 flex flex-wrap items-center gap-2">
              <label htmlFor="class-name-input" className="text-xs text-foreground">
                {t(i18nKeys.school.classesUi.form.className)}
              </label>
              <input
                id="class-name-input"
                type="text"
                value={classFormName}
                onChange={(event) => setClassFormName(event.target.value)}
                className="w-40 min-w-[140px] flex-1 rounded-lg border bg-background px-2 py-1.5 text-sm"
              />
              <select
                value={classFormGradeId}
                onChange={(event) => setClassFormGradeId(event.target.value)}
                className="w-40 min-w-[140px] flex-1 rounded-lg border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">{t(i18nKeys.school.classesUi.form.classGrade)}</option>
                {grades.map((grade) => (
                  <option key={grade.id} value={grade.id}>
                    {grade.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={classSaving}
                className={`cursor-pointer rounded-full border-none bg-green-600 px-2.5 py-1.5 text-xs text-white hover:bg-green-700 ${
                  classSaving ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                {classSaving ? t(i18nKeys.common.loading) : t(i18nKeys.school.classesUi.form.save)}
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
            <p className="text-sm text-muted-foreground">
              {t(i18nKeys.school.classesUi.classes.empty)}
            </p>
          ) : (
            <ul className="m-0 list-none rounded-xl border bg-card p-0">
              {classes.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between border-b px-2.5 py-2 last:border-0"
                >
                  <div>
                    <div className="text-sm text-foreground">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {gradeNameById(item.gradeId)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {classDeleteCandidateId === item.id ? (
                      <>
                        <span className="text-muted-foreground">
                          {t(i18nKeys.school.classesUi.grades.deleteConfirmTitle)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setClassDeleteCandidateId(null)}
                          className="cursor-pointer rounded-full border bg-background px-2 py-1 hover:bg-muted"
                        >
                          {t(i18nKeys.school.classesUi.form.cancel)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteClass(item.id)}
                          className="cursor-pointer rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
                        >
                          {t(i18nKeys.school.classesUi.grades.delete)}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditClass(item)}
                          className="cursor-pointer rounded-full border bg-background px-2 py-1 text-foreground hover:bg-muted"
                        >
                          {t(i18nKeys.school.classesUi.grades.edit)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassDeleteCandidateId(item.id)}
                          className="cursor-pointer rounded-full border border-destructive/50 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
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
    </div>
  );
}
