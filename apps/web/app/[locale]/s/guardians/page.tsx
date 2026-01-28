'use client';

import type { ChangeEvent, FormEvent } from 'react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Plus,
  Search,
  User,
  Mail,
  Phone,
  FileText,
  Shield,
  Trash2,
  Link as LinkIcon,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

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

  // Form / Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCpf, setFormCpf] = useState('');
  const [formRg, setFormRg] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNewStudents, setFormNewStudents] = useState<{ name: string; birthDate: string }[]>([]);
  const [formStatus, setFormStatus] = useState<GuardianStatus>('ACTIVE');
  const [saving, setSaving] = useState(false);

  // Student Linking State (inside Edit Sheet)
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  // Local state for adding a student in the form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentBirthDate, setNewStudentBirthDate] = useState('');

  // Computed for Edit Mode
  const editingGuardian = guardians.find((g) => g.id === editingGuardianId);
  const linkedStudents =
    editingGuardian?.studentIds
      ?.map((id) => students.find((s) => s.id === id))
      .filter((s): s is Student => Boolean(s)) ?? [];

  const availableStudents = students.filter(
    (student) => !editingGuardian?.studentIds?.includes(student.id)
  );

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
    setFormCpf('');
    setFormRg('');
    setFormAddress('');
    setFormNewStudents([]);
    setNewStudentName('');
    setNewStudentBirthDate('');
    setFormStatus('ACTIVE');
    setGuardiansError(null);
    setIsSheetOpen(true);
  }

  function openEditGuardian(guardian: Guardian) {
    setFormMode('edit');
    setEditingGuardianId(guardian.id);
    setFormName(guardian.name);
    setFormEmail(guardian.user?.email ?? '');
    setFormPhone(guardian.phone);
    setFormStatus(guardian.status);
    setGuardiansError(null);
    setIsSheetOpen(true);
  }

  function closeSheet() {
    setIsSheetOpen(false);
    setTimeout(() => {
      setFormMode(null);
      setEditingGuardianId(null);
    }, 300); // Wait for animation
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
            cpf: formCpf,
            rg: formRg,
            address: formAddress ? { line: formAddress } : undefined,
            students: formNewStudents,
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

      closeSheet();
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

  async function handleLinkStudent(event: FormEvent) {
    event.preventDefault();
    if (!editingGuardianId || !linkStudentId) return;

    setLinking(true);
    try {
      const res = await apiFetch(`/school/guardians/${editingGuardianId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentId: linkStudentId }),
      });
      if (!res.ok) {
        // Show error somewhere
        return;
      }
      setLinkStudentId('');
      await loadGuardians(); // Reload to update list and computed linkedStudents
    } catch {
      // Show error
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlinkStudent(studentId: string) {
    if (!editingGuardianId) return;

    setUnlinkingId(studentId);
    try {
      const res = await apiFetch(`/school/guardians/${editingGuardianId}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        return;
      }
      await loadGuardians();
    } catch {
      // Error
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t(i18nKeys.school.pages.guardians.title)}
          </h1>
          <p className="text-muted-foreground">{t(i18nKeys.school.pages.guardians.description)}</p>
        </div>
        <Button onClick={openCreateGuardian}>
          <Plus className="mr-2 h-4 w-4" />
          {t(i18nKeys.school.guardiansUi.actions.create)}
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t(i18nKeys.school.guardiansUi.filters.search)}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as FilterStatus);
            setPage(1);
          }}
        >
          <option value="ALL">{t(i18nKeys.school.guardiansUi.filters.statusAll)}</option>
          <option value="ACTIVE">{t(i18nKeys.school.guardiansUi.status.active)}</option>
          <option value="INACTIVE">{t(i18nKeys.school.guardiansUi.status.inactive)}</option>
        </select>
        <Button variant="outline" onClick={loadGuardians} disabled={guardiansLoading}>
          {guardiansLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      {guardiansError && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {guardiansError}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {guardiansLoading ? (
            <div className="flex justify-center p-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : guardians.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <ShieldAlert className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p>{t(i18nKeys.school.guardiansUi.empty)}</p>
            </div>
          ) : (
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t(i18nKeys.school.guardiansUi.table.name)}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t(i18nKeys.school.guardiansUi.table.email)}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t(i18nKeys.school.guardiansUi.table.phone)}
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {t(i18nKeys.school.guardiansUi.table.status)}
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      {t(i18nKeys.school.guardiansUi.table.actions)}
                    </th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {guardians.map((guardian) => (
                    <tr
                      key={guardian.id}
                      className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                    >
                      <td className="p-4 align-middle font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {guardian.name}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {guardian.user?.email}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {guardian.phone}
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        {guardian.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-800 dark:text-green-100">
                            {t(i18nKeys.school.guardiansUi.status.active)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                            {t(i18nKeys.school.guardiansUi.status.inactive)}
                          </span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditGuardian(guardian)}>
                              Edição Rápida
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/${locale || 'pt-BR'}/s/guardians/${guardian.id}`}>
                                <FileText className="mr-2 h-4 w-4" />
                                {t(i18nKeys.school.reportsUi.guardian.title)}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => void handleToggleStatus(guardian)}>
                              {guardian.status === 'ACTIVE' ? (
                                <>
                                  <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />
                                  Inativar
                                </>
                              ) : (
                                <>
                                  <Shield className="mr-2 h-4 w-4 text-green-500" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-4">
            <div className="text-sm text-muted-foreground">
              {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {formMode === 'create'
                ? t(i18nKeys.school.guardiansUi.actions.create)
                : t(i18nKeys.school.guardiansUi.actions.edit)}
            </SheetTitle>
            <SheetDescription>
              {formMode === 'create'
                ? 'Preencha os dados para cadastrar um novo responsável.'
                : 'Edite os dados do responsável e gerencie os alunos vinculados.'}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmitGuardian} className="space-y-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t(i18nKeys.school.guardiansUi.table.name)}</Label>
                <Input
                  placeholder="Nome completo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t(i18nKeys.school.guardiansUi.table.email)}</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  disabled={formMode === 'edit'} // Usually email is tied to user, so maybe not editable easily here without more backend logic
                />
                {formMode === 'edit' && (
                  <p className="text-[0.8rem] text-muted-foreground">
                    O e-mail não pode ser alterado diretamente.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t(i18nKeys.school.guardiansUi.table.phone)}</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Label>{t(i18nKeys.school.guardiansUi.table.cpf)}</Label>
                  <Input
                    placeholder="000.000.000-00"
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>{t(i18nKeys.school.guardiansUi.table.rg)}</Label>
                  <Input
                    placeholder="00.000.000-0"
                    value={formRg}
                    onChange={(e) => setFormRg(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t(i18nKeys.school.guardiansUi.table.address)}</Label>
                <Input
                  placeholder="Rua, número, bairro..."
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                />
              </div>

              {formMode === 'create' && (
                <div className="space-y-4 rounded-md border p-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Alunos (Novos)</Label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t(i18nKeys.school.guardiansUi.table.studentName)}</Label>
                      <Input
                        placeholder="Nome do aluno"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t(i18nKeys.school.guardiansUi.table.studentBirthDate)}</Label>
                      <Input
                        type="date"
                        value={newStudentBirthDate}
                        onChange={(e) => setNewStudentBirthDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      if (newStudentName.trim()) {
                        setFormNewStudents([
                          ...formNewStudents,
                          { name: newStudentName, birthDate: newStudentBirthDate },
                        ]);
                        setNewStudentName('');
                        setNewStudentBirthDate('');
                      }
                    }}
                    disabled={!newStudentName.trim()}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t(i18nKeys.school.guardiansUi.table.addStudent)}
                  </Button>

                  {formNewStudents.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {formNewStudents.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-md bg-background border p-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{s.name}</p>
                            {s.birthDate && (
                              <p className="text-muted-foreground text-xs">{s.birthDate}</p>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() =>
                              setFormNewStudents(formNewStudents.filter((_, i) => i !== idx))
                            }
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t(i18nKeys.school.guardiansUi.table.status)}</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as GuardianStatus)}
                >
                  <option value="ACTIVE">{t(i18nKeys.school.guardiansUi.status.active)}</option>
                  <option value="INACTIVE">{t(i18nKeys.school.guardiansUi.status.inactive)}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeSheet}>
                {t(i18nKeys.common.cancel)}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t(i18nKeys.school.classesUi.form.save)}
              </Button>
            </div>
          </form>

          {formMode === 'edit' && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Alunos Vinculados
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {studentsLoading ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Carregando alunos...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {linkedStudents.length > 0 ? (
                      <div className="rounded-md border">
                        {linkedStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{student.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive/90"
                              onClick={() => void handleUnlinkStudent(student.id)}
                              disabled={unlinkingId === student.id}
                            >
                              {unlinkingId === student.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-2">
                        Nenhum aluno vinculado.
                      </p>
                    )}
                  </div>
                )}

                <form onSubmit={handleLinkStudent} className="flex gap-2">
                  <select
                    className="h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={linkStudentId}
                    onChange={(e) => setLinkStudentId(e.target.value)}
                  >
                    <option value="">Selecione para vincular...</option>
                    {availableStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={!linkStudentId || linking}>
                    {linking ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LinkIcon className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
