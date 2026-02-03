'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type ContractStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED';

type Contract = {
  id: string;
  name: string;
  amountCents: number;
  currency: string;
  dueDay: number;
  startDate: string;
  endDate: string | null;
  status: ContractStatus;
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

type FilterStatus = 'ALL' | ContractStatus;

function formatAmount(amountCents: number, currency: string) {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function parseAmountToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replaceAll(/[\s.]/g, '').replaceAll(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export default function SchoolContractsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDay, setFormDueDay] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [detailStudents, setDetailStudents] = useState<Student[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentIdsToAdd, setStudentIdsToAdd] = useState<string[]>([]);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [unlinkingStudentId, setUnlinkingStudentId] = useState<string | null>(null);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadContracts = useCallback(async () => {
    setContractsLoading(true);
    setContractsError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '50');
      if (filterStatus !== 'ALL') params.set('status', filterStatus);
      const q = searchQuery.trim();
      if (q) params.set('q', q);

      const res = await apiFetch(`/school/contracts?${params.toString()}`);
      if (!res.ok) {
        setContractsError(t(i18nKeys.school.contractsUi.feedback.loadError));
        setContracts([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<Contract>;
      setContracts(data.items);
    } catch {
      setContractsError(t(i18nKeys.school.contractsUi.feedback.loadError));
      setContracts([]);
    } finally {
      setContractsLoading(false);
    }
  }, [apiFetch, filterStatus, searchQuery, t]);

  const loadAllStudents = useCallback(async () => {
    setStudentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '200');
      params.set('status', 'ACTIVE');

      const res = await apiFetch(`/school/students?${params.toString()}`);
      if (!res.ok) {
        setAllStudents([]);
        return;
      }

      const data = (await res.json()) as PagedResponse<Student>;
      setAllStudents(data.items);
    } catch {
      setAllStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  }, [apiFetch]);

  const loadContractDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      setDetailError(null);
      setLinkError(null);
      setStudentIdsToAdd([]);

      try {
        const res = await apiFetch(`/school/contracts/${id}`);
        if (!res.ok) {
          setDetailError(t(i18nKeys.school.contractsUi.feedback.loadError));
          setSelectedContract(null);
          setDetailStudents([]);
          return;
        }

        const data = (await res.json()) as { contract: Contract; students: Student[] };
        setSelectedContract(data.contract);
        setDetailStudents(data.students);

        if (allStudents.length === 0) {
          void loadAllStudents();
        }
      } catch {
        setDetailError(t(i18nKeys.school.contractsUi.feedback.loadError));
        setSelectedContract(null);
        setDetailStudents([]);
      } finally {
        setDetailLoading(false);
      }
    },
    [allStudents.length, apiFetch, loadAllStudents, t]
  );

  useEffect(() => {
    void loadContracts();
  }, [loadContracts]);

  const availableStudents = useMemo(() => {
    if (!selectedContract) return [];
    const linkedIds = new Set(detailStudents.map((s) => s.id));
    return allStudents.filter((student) => !linkedIds.has(student.id));
  }, [allStudents, detailStudents, selectedContract]);

  function resetForm() {
    setFormMode(null);
    setEditingContractId(null);
    setFormName('');
    setFormAmount('');
    setFormDueDay('');
    setFormStartDate('');
    setFormEndDate('');
    setFormError(null);
  }

  function openCreateContract() {
    resetForm();
    setFormMode('create');
  }

  function openEditContract(contract: Contract) {
    setFormMode('edit');
    setEditingContractId(contract.id);
    setFormName(contract.name);
    setFormAmount((contract.amountCents / 100).toString());
    setFormDueDay(String(contract.dueDay));
    setFormStartDate(contract.startDate.slice(0, 10));
    setFormEndDate(contract.endDate ? contract.endDate.slice(0, 10) : '');
    setFormError(null);
  }

  function handleFilterStatusChange(event: ChangeEvent<HTMLSelectElement>) {
    setFilterStatus(event.target.value as FilterStatus);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    void loadContracts();
  }

  async function handleSubmitContract(event: FormEvent) {
    event.preventDefault();
    if (!formMode) return;

    const name = formName.trim();
    const amountCents = parseAmountToCents(formAmount);
    const dueDayNumber = Number(formDueDay);
    const startDate = formStartDate.trim();
    const endDateValue = formEndDate.trim();

    if (!name || amountCents === null || !Number.isInteger(dueDayNumber) || !startDate) {
      setFormError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    if (dueDayNumber < 1 || dueDayNumber > 28) {
      setFormError(t(i18nKeys.requestDemo.error.validation));
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        amountCents,
        dueDay: dueDayNumber,
        startDate,
      };
      if (endDateValue) {
        payload.endDate = endDateValue;
      }

      const method = formMode === 'create' ? 'POST' : 'PUT';
      const path =
        formMode === 'create'
          ? '/school/contracts'
          : `/school/contracts/${editingContractId as string}`;

      const res = await apiFetch(path, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        setFormError(t(i18nKeys.school.contractsUi.feedback.saveError));
        return;
      }

      const data = (await res.json()) as { contract: Contract };
      resetForm();
      await loadContracts();
      setSelectedContract(data.contract);
      void loadContractDetail(data.contract.id);
    } catch {
      setFormError(t(i18nKeys.school.contractsUi.feedback.saveError));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddStudents(event: FormEvent) {
    event.preventDefault();
    if (!selectedContract || studentIdsToAdd.length === 0) return;

    setLinking(true);
    setLinkError(null);

    try {
      const res = await apiFetch(`/school/contracts/${selectedContract.id}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds: studentIdsToAdd }),
      });

      if (!res.ok) {
        setLinkError(t(i18nKeys.school.contractsUi.feedback.linkError));
        return;
      }

      setStudentIdsToAdd([]);
      await loadContractDetail(selectedContract.id);
    } catch {
      setLinkError(t(i18nKeys.school.contractsUi.feedback.linkError));
    } finally {
      setLinking(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!selectedContract) return;

    setUnlinkingStudentId(studentId);
    setLinkError(null);

    try {
      const res = await apiFetch(`/school/contracts/${selectedContract.id}/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        setLinkError(t(i18nKeys.school.contractsUi.feedback.unlinkError));
        return;
      }

      setDetailStudents((prev) => prev.filter((student) => student.id !== studentId));
    } catch {
      setLinkError(t(i18nKeys.school.contractsUi.feedback.unlinkError));
    } finally {
      setUnlinkingStudentId(null);
    }
  }

  async function handleStatusChange(next: ContractStatus) {
    if (!selectedContract) return;

    if (
      next === 'CANCELED' &&
      globalThis.window !== undefined &&
      !globalThis.window.confirm(t(i18nKeys.school.contractsUi.detail.confirmCancelDescription))
    ) {
      return;
    }

    setStatusUpdating(true);
    setDetailError(null);

    try {
      const actionPath = next === 'ACTIVE' ? 'resume' : next === 'PAUSED' ? 'pause' : 'cancel';

      const res = await apiFetch(`/school/contracts/${selectedContract.id}/${actionPath}`, {
        method: 'POST',
      });

      if (!res.ok) {
        setDetailError(t(i18nKeys.school.contractsUi.feedback.statusError));
        return;
      }

      const data = (await res.json()) as { contract: Contract };
      setSelectedContract(data.contract);
      setContracts((prev) =>
        prev.map((contract) => (contract.id === data.contract.id ? data.contract : contract))
      );
    } catch {
      setDetailError(t(i18nKeys.school.contractsUi.feedback.statusError));
    } finally {
      setStatusUpdating(false);
    }
  }

  function statusLabel(status: ContractStatus) {
    if (status === 'ACTIVE') return t(i18nKeys.school.contractsUi.status.active);
    if (status === 'PAUSED') return t(i18nKeys.school.contractsUi.status.paused);
    return t(i18nKeys.school.contractsUi.status.canceled);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="mb-1 mt-0 text-xl font-semibold">
          {t(i18nKeys.school.pages.contracts.title)}
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          {t(i18nKeys.school.pages.contracts.description)}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder={t(i18nKeys.school.contractsUi.filters.search)}
            className="w-60 rounded-lg border bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={filterStatus}
            onChange={handleFilterStatusChange}
            className="rounded-lg border bg-background px-3 py-1.5 text-sm"
          >
            <option value="ALL">{t(i18nKeys.school.contractsUi.filters.statusAll)}</option>
            <option value="ACTIVE">{t(i18nKeys.school.contractsUi.status.active)}</option>
            <option value="PAUSED">{t(i18nKeys.school.contractsUi.status.paused)}</option>
            <option value="CANCELED">{t(i18nKeys.school.contractsUi.status.canceled)}</option>
          </select>
          <button
            type="submit"
            className="cursor-pointer rounded-full border bg-background px-4 py-1.5 text-sm font-medium hover:bg-muted"
          >
            {t(i18nKeys.common.ok)}
          </button>
        </form>

        <button
          type="button"
          onClick={openCreateContract}
          className="cursor-pointer rounded-full border-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t(i18nKeys.school.contractsUi.actions.create)}
        </button>
      </div>

      {contractsError && <p>{contractsError}</p>}

      {contractsLoading ? (
        <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(i18nKeys.school.contractsUi.empty)}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  {t(i18nKeys.school.contractsUi.table.name)}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(i18nKeys.school.contractsUi.table.amount)}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(i18nKeys.school.contractsUi.table.dueDay)}
                </th>
                <th className="px-4 py-3 font-medium">
                  {t(i18nKeys.school.contractsUi.table.status)}
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  {t(i18nKeys.school.contractsUi.table.actions)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">{contract.name}</td>
                  <td className="px-4 py-3">
                    {formatAmount(contract.amountCents, contract.currency)}
                  </td>
                  <td className="px-4 py-3">{contract.dueDay}</td>
                  <td className="px-4 py-3">{statusLabel(contract.status)}</td>
                  <td className="flex justify-end gap-2 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void loadContractDetail(contract.id)}
                      className="cursor-pointer rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
                    >
                      {t(i18nKeys.school.contractsUi.actions.viewDetails)}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditContract(contract)}
                      className="cursor-pointer rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
                    >
                      {t(i18nKeys.school.contractsUi.actions.edit)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formMode && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-4 mt-0 text-lg font-semibold">
            {formMode === 'create'
              ? t(i18nKeys.school.contractsUi.actions.create)
              : t(i18nKeys.school.contractsUi.actions.edit)}
          </h2>
          <form onSubmit={handleSubmitContract} className="flex flex-col gap-4">
            {formError && (
              <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm text-foreground">
                {t(i18nKeys.school.contractsUi.form.name)}
                <input
                  type="text"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-foreground">
                {t(i18nKeys.school.contractsUi.form.amount)}
                <input
                  type="text"
                  value={formAmount}
                  onChange={(event) => setFormAmount(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-foreground">
                {t(i18nKeys.school.contractsUi.form.dueDay)}
                <input
                  type="number"
                  value={formDueDay}
                  onChange={(event) => setFormDueDay(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-foreground">
                {t(i18nKeys.school.contractsUi.form.startDate)}
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(event) => setFormStartDate(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-foreground">
                {t(i18nKeys.school.contractsUi.form.endDate)}
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(event) => setFormEndDate(event.target.value)}
                  className="rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="cursor-pointer rounded-full border bg-background px-4 py-2 text-sm hover:bg-muted"
              >
                {t(i18nKeys.school.contractsUi.form.cancel)}
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`cursor-pointer rounded-full border-none bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 ${
                  saving ? 'cursor-not-allowed opacity-70' : ''
                }`}
              >
                {saving ? t(i18nKeys.common.loading) : t(i18nKeys.school.contractsUi.form.save)}
              </button>
            </div>
          </form>
        </div>
      )}

      <hr className="border-t" />

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="mb-4 mt-0 text-lg font-semibold">
          {t(i18nKeys.school.contractsUi.detail.title)}
        </h2>

        {detailError && (
          <p className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {detailError}
          </p>
        )}

        {detailLoading ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
        ) : !selectedContract ? (
          <p className="text-sm text-muted-foreground">{t(i18nKeys.school.contractsUi.empty)}</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/30 p-4">
              <div>
                <p className="font-medium">{selectedContract.name}</p>
                <p className="text-sm text-muted-foreground">
                  {statusLabel(selectedContract.status)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleStatusChange('PAUSED')}
                  disabled={statusUpdating || selectedContract.status !== 'ACTIVE'}
                  className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {t(i18nKeys.school.contractsUi.actions.pause)}
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange('ACTIVE')}
                  disabled={statusUpdating || selectedContract.status !== 'PAUSED'}
                  className="cursor-pointer rounded-full border bg-background px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {t(i18nKeys.school.contractsUi.actions.resume)}
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange('CANCELED')}
                  disabled={statusUpdating || selectedContract.status === 'CANCELED'}
                  className="cursor-pointer rounded-full border border-destructive/50 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {t(i18nKeys.school.contractsUi.actions.cancel)}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="m-0 text-base font-semibold">
                {t(i18nKeys.school.contractsUi.detail.studentsTitle)}
              </h3>

              {linkError && (
                <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {linkError}
                </p>
              )}

              {studentsLoading ? (
                <p className="text-sm text-muted-foreground">{t(i18nKeys.common.loading)}</p>
              ) : detailStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t(i18nKeys.school.contractsUi.empty)}
                </p>
              ) : (
                <ul className="m-0 list-none divide-y rounded-lg border">
                  {detailStudents.map((student) => (
                    <li key={student.id} className="flex items-center justify-between p-3">
                      <span className="text-sm">{student.name}</span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveStudent(student.id)}
                        disabled={unlinkingStudentId === student.id}
                        className="cursor-pointer rounded-full border-none text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        {t(i18nKeys.school.contractsUi.detail.remove)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {availableStudents.length > 0 && (
                <form
                  onSubmit={handleAddStudents}
                  className="flex flex-col gap-3 rounded-lg border p-4"
                >
                  <label className="flex flex-col gap-1.5 text-sm">
                    {t(i18nKeys.school.contractsUi.detail.addStudents)}
                    <select
                      multiple
                      value={studentIdsToAdd}
                      onChange={(event) => {
                        const options = Array.from(event.target.selectedOptions);
                        setStudentIdsToAdd(options.map((option) => option.value));
                      }}
                      className="min-h-[100px] rounded-lg border bg-background p-2 text-sm"
                    >
                      {availableStudents.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={linking || studentIdsToAdd.length === 0}
                      className="cursor-pointer rounded-full border-none bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {linking
                        ? t(i18nKeys.common.loading)
                        : t(i18nKeys.school.contractsUi.detail.addStudents)}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
