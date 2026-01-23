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
  const normalized = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
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
      typeof window !== 'undefined' &&
      !window.confirm(t(i18nKeys.school.contractsUi.detail.confirmCancelDescription))
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
    <div>
      <h1>{t(i18nKeys.school.pages.contracts.title)}</h1>
      <p>{t(i18nKeys.school.pages.contracts.description)}</p>

      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={t(i18nKeys.school.contractsUi.filters.search)}
        />
        <select value={filterStatus} onChange={handleFilterStatusChange}>
          <option value="ALL">{t(i18nKeys.school.contractsUi.filters.statusAll)}</option>
          <option value="ACTIVE">{t(i18nKeys.school.contractsUi.status.active)}</option>
          <option value="PAUSED">{t(i18nKeys.school.contractsUi.status.paused)}</option>
          <option value="CANCELED">{t(i18nKeys.school.contractsUi.status.canceled)}</option>
        </select>
        <button type="submit">{t(i18nKeys.common.ok)}</button>
      </form>

      <button type="button" onClick={openCreateContract}>
        {t(i18nKeys.school.contractsUi.actions.create)}
      </button>

      {contractsError && <p>{contractsError}</p>}

      {contractsLoading ? (
        <p>{t(i18nKeys.common.loading)}</p>
      ) : contracts.length === 0 ? (
        <p>{t(i18nKeys.school.contractsUi.empty)}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{t(i18nKeys.school.contractsUi.table.name)}</th>
              <th>{t(i18nKeys.school.contractsUi.table.amount)}</th>
              <th>{t(i18nKeys.school.contractsUi.table.dueDay)}</th>
              <th>{t(i18nKeys.school.contractsUi.table.status)}</th>
              <th>{t(i18nKeys.school.contractsUi.table.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr key={contract.id}>
                <td>{contract.name}</td>
                <td>{formatAmount(contract.amountCents, contract.currency)}</td>
                <td>{contract.dueDay}</td>
                <td>{statusLabel(contract.status)}</td>
                <td>
                  <button type="button" onClick={() => void loadContractDetail(contract.id)}>
                    {t(i18nKeys.school.contractsUi.actions.viewDetails)}
                  </button>
                  <button type="button" onClick={() => openEditContract(contract)}>
                    {t(i18nKeys.school.contractsUi.actions.edit)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {formMode && (
        <form onSubmit={handleSubmitContract}>
          {formError && <p>{formError}</p>}
          <div>
            <label>
              {t(i18nKeys.school.contractsUi.form.name)}
              <input
                type="text"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              {t(i18nKeys.school.contractsUi.form.amount)}
              <input
                type="text"
                value={formAmount}
                onChange={(event) => setFormAmount(event.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              {t(i18nKeys.school.contractsUi.form.dueDay)}
              <input
                type="number"
                value={formDueDay}
                onChange={(event) => setFormDueDay(event.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              {t(i18nKeys.school.contractsUi.form.startDate)}
              <input
                type="date"
                value={formStartDate}
                onChange={(event) => setFormStartDate(event.target.value)}
              />
            </label>
          </div>
          <div>
            <label>
              {t(i18nKeys.school.contractsUi.form.endDate)}
              <input
                type="date"
                value={formEndDate}
                onChange={(event) => setFormEndDate(event.target.value)}
              />
            </label>
          </div>
          <button type="button" onClick={resetForm}>
            {t(i18nKeys.school.contractsUi.form.cancel)}
          </button>
          <button type="submit" disabled={saving}>
            {saving ? t(i18nKeys.common.loading) : t(i18nKeys.school.contractsUi.form.save)}
          </button>
        </form>
      )}

      <hr />

      <h2>{t(i18nKeys.school.contractsUi.detail.title)}</h2>

      {detailError && <p>{detailError}</p>}

      {detailLoading ? (
        <p>{t(i18nKeys.common.loading)}</p>
      ) : !selectedContract ? (
        <p>{t(i18nKeys.school.contractsUi.empty)}</p>
      ) : (
        <>
          <p>{selectedContract.name}</p>
          <p>{statusLabel(selectedContract.status)}</p>
          <button
            type="button"
            onClick={() => void handleStatusChange('PAUSED')}
            disabled={statusUpdating || selectedContract.status !== 'ACTIVE'}
          >
            {t(i18nKeys.school.contractsUi.actions.pause)}
          </button>
          <button
            type="button"
            onClick={() => void handleStatusChange('ACTIVE')}
            disabled={statusUpdating || selectedContract.status !== 'PAUSED'}
          >
            {t(i18nKeys.school.contractsUi.actions.resume)}
          </button>
          <button
            type="button"
            onClick={() => void handleStatusChange('CANCELED')}
            disabled={statusUpdating || selectedContract.status === 'CANCELED'}
          >
            {t(i18nKeys.school.contractsUi.actions.cancel)}
          </button>

          <h3>{t(i18nKeys.school.contractsUi.detail.studentsTitle)}</h3>

          {linkError && <p>{linkError}</p>}

          {studentsLoading ? (
            <p>{t(i18nKeys.common.loading)}</p>
          ) : detailStudents.length === 0 ? (
            <p>{t(i18nKeys.school.contractsUi.empty)}</p>
          ) : (
            <ul>
              {detailStudents.map((student) => (
                <li key={student.id}>
                  {student.name}{' '}
                  <button
                    type="button"
                    onClick={() => void handleRemoveStudent(student.id)}
                    disabled={unlinkingStudentId === student.id}
                  >
                    {t(i18nKeys.school.contractsUi.detail.remove)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {availableStudents.length > 0 && (
            <form onSubmit={handleAddStudents}>
              <label>
                {t(i18nKeys.school.contractsUi.detail.addStudents)}
                <select
                  multiple
                  value={studentIdsToAdd}
                  onChange={(event) => {
                    const options = Array.from(event.target.selectedOptions);
                    setStudentIdsToAdd(options.map((option) => option.value));
                  }}
                >
                  {availableStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" disabled={linking || studentIdsToAdd.length === 0}>
                {linking
                  ? t(i18nKeys.common.loading)
                  : t(i18nKeys.school.contractsUi.detail.addStudents)}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
