import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type ContractStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED';

type ContractEntity = {
  id: string;
  tenantId: string;
  name: string;
  amountCents: number;
  currency: string;
  dueDay: number;
  startDate: Date;
  endDate: Date | null;
  status: ContractStatus;
  createdByUserId: string;
  createdAt: Date;
};

type StudentEntity = {
  id: string;
  tenantId: string;
  classId: string;
  name: string;
};

type ContractStudentEntity = {
  id: string;
  contractId: string;
  studentId: string;
  createdAt: Date;
};

type TenantRequest = {
  tenant?: { id: string; slug: string };
};

type CurrentUser = {
  id: string;
  email: string;
  userType: string;
  tenantId?: string;
  role?: string;
};

function createTenantRequest(tenantId: string): TenantRequest {
  return {
    tenant: { id: tenantId, slug: 'tenant-slug' },
  };
}

async function run() {
  const contracts: ContractEntity[] = [];
  const students: StudentEntity[] = [];
  const contractStudents: ContractStudentEntity[] = [];
  const auditLogs: { action: string; tenantId?: string | null }[] = [];

  let idCounter = 0;
  const nextId = () => `id-${++idCounter}`;

  const prismaMock = {
    contract: {
      count: async (args: { where: { tenantId: string; status?: ContractStatus; name?: { contains: string } } }) => {
        const { tenantId, status, name } = args.where;
        return contracts.filter((c) => {
          if (c.tenantId !== tenantId) return false;
          if (status && c.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!c.name.toLowerCase().includes(q)) return false;
          }
          return true;
        }).length;
      },
      findMany: async (args: {
        where: { tenantId: string; status?: ContractStatus; name?: { contains: string } };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        const { tenantId, status, name } = args.where;
        const skip = args.skip ?? 0;
        const take = args.take ?? contracts.length;

        const filtered = contracts.filter((c) => {
          if (c.tenantId !== tenantId) return false;
          if (status && c.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!c.name.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        const ordered =
          (args.orderBy?.createdAt ?? 'desc') === 'desc'
            ? [...filtered].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            : [...filtered].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        return ordered.slice(skip, skip + take);
      },
      create: async (args: {
        data: {
          tenantId: string;
          name: string;
          amountCents: number;
          currency: string;
          dueDay: number;
          startDate: Date;
          endDate: Date | null;
          status: ContractStatus;
          createdByUserId: string;
        };
      }) => {
        const now = new Date();
        const contract: ContractEntity = {
          id: nextId(),
          tenantId: args.data.tenantId,
          name: args.data.name,
          amountCents: args.data.amountCents,
          currency: args.data.currency,
          dueDay: args.data.dueDay,
          startDate: args.data.startDate,
          endDate: args.data.endDate,
          status: args.data.status,
          createdByUserId: args.data.createdByUserId,
          createdAt: now,
        };
        contracts.push(contract);
        return contract;
      },
      findFirst: async (args: { where: { id?: string; tenantId?: string } }) => {
        const { id, tenantId } = args.where;
        const contract = contracts.find(
          (c) =>
            (id === undefined || c.id === id) &&
            (tenantId === undefined || c.tenantId === tenantId)
        );
        return contract ?? null;
      },
      update: async (args: {
        where: { id: string };
        data: Partial<Pick<ContractEntity, 'name' | 'amountCents' | 'currency' | 'dueDay' | 'startDate' | 'endDate' | 'status'>>;
      }) => {
        const contract = contracts.find((c) => c.id === args.where.id);
        if (!contract) {
          throw new Error('Not found');
        }
        Object.assign(contract, args.data);
        return contract;
      },
    },
    student: {
      findMany: async (args: { where: { id: { in: string[] }; tenantId: string }; select?: { id: true } }) => {
        const { id, tenantId } = args.where;
        const found = students.filter((s) => id.in.includes(s.id) && s.tenantId === tenantId);
        if (args.select?.id) {
          return found.map((s) => ({ id: s.id }));
        }
        return found;
      },
      findFirst: async (args: { where: { id?: string; tenantId?: string }; select?: { id: true } }) => {
        const { id, tenantId } = args.where;
        const student = students.find(
          (s) =>
            (id === undefined || s.id === id) &&
            (tenantId === undefined || s.tenantId === tenantId)
        );
        if (!student) return null;
        if (args.select?.id) return { id: student.id };
        return student;
      },
    },
    contractStudent: {
      createMany: async (args: {
        data: Array<{ contractId: string; studentId: string }>;
        skipDuplicates?: boolean;
      }) => {
        for (const row of args.data) {
          const exists = contractStudents.some(
            (cs) =>
              cs.contractId === row.contractId &&
              cs.studentId === row.studentId
          );
          if (exists && args.skipDuplicates) continue;
          const entity: ContractStudentEntity = {
            id: nextId(),
            contractId: row.contractId,
            studentId: row.studentId,
            createdAt: new Date(),
          };
          contractStudents.push(entity);
        }
        return { count: args.data.length };
      },
      deleteMany: async (args: {
        where: { contractId: string; studentId: string };
      }) => {
        const before = contractStudents.length;
        for (let i = contractStudents.length - 1; i >= 0; i -= 1) {
          if (
            contractStudents[i].contractId === args.where.contractId &&
            contractStudents[i].studentId === args.where.studentId
          ) {
            contractStudents.splice(i, 1);
          }
        }
        const count = before - contractStudents.length;
        return { count };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  } as unknown as PrismaService;

  const auditServiceMock: AuditService = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    log: async (input) => {
      auditLogs.push({ action: input.action, tenantId: input.tenantId });
    },
  } as unknown as AuditService;

  const controller = new ContractsController(prismaMock, auditServiceMock);

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';

  const reqTenant = createTenantRequest(tenantId) as TenantRequest;
  const otherReq = createTenantRequest(otherTenantId) as TenantRequest;

  const user: CurrentUser = {
    id: 'user-1',
    email: 'admin@school.com',
    userType: 'STAFF',
    tenantId,
    role: 'SCHOOL_ADMIN',
  };

  // Seed some students
  const classId = 'class-1';
  const otherClassId = 'class-2';
  const studentA: StudentEntity = {
    id: nextId(),
    tenantId,
    classId,
    name: 'Aluno A',
  };
  const studentOtherTenant: StudentEntity = {
    id: nextId(),
    tenantId: otherTenantId,
    classId: otherClassId,
    name: 'Aluno B',
  };
  students.push(studentA, studentOtherTenant);

  // ---- Create contract ----
  const createResult = await controller.createContract(reqTenant, {
    name: 'Mensalidade 2026 - João',
    amountCents: 95000,
    currency: 'BRL',
    dueDay: 10,
    startDate: new Date('2026-01-01').toISOString(),
  }, user);

  if (!createResult.contract || createResult.contract.name !== 'Mensalidade 2026 - João') {
    throw new Error('createContract should return created contract');
  }

  if (!auditLogs.some((log) => log.action === 'contract.create')) {
    throw new Error('createContract should write contract.create audit log');
  }

  const contractId = createResult.contract.id;

  // ---- List contracts tenant scoped ----
  await controller.createContract(otherReq, {
    name: 'Mensalidade outro tenant',
    amountCents: 50000,
    currency: 'BRL',
    dueDay: 5,
    startDate: new Date('2026-01-01').toISOString(),
  }, {
    ...user,
    id: 'user-2',
    tenantId: otherTenantId,
  });

  const list = await controller.listContracts(reqTenant, 'Mensalidade', 'ACTIVE', '1', '10');
  if (list.total !== 1 || list.items[0].tenantId !== tenantId) {
    throw new Error('listContracts should be scoped by tenant, status and q filter');
  }

  // ---- Update contract ----
  const updated = await controller.updateContract(
    reqTenant,
    contractId,
    {
      name: 'Mensalidade 2026 - João Silva',
      dueDay: 15,
    },
    user,
  );

  if (updated.contract.name !== 'Mensalidade 2026 - João Silva' || updated.contract.dueDay !== 15) {
    throw new Error('updateContract should update fields');
  }

  let noChangesError = false;
  try {
    await controller.updateContract(reqTenant, contractId, {}, user);
  } catch (error) {
    noChangesError = error instanceof BadRequestException;
  }
  if (!noChangesError) {
    throw new Error('updateContract should reject empty payload');
  }

  // ---- Status transitions ----
  await controller.pauseContract(reqTenant, contractId, user);
  const paused = contracts.find((c) => c.id === contractId);
  if (!paused || paused.status !== 'PAUSED') {
    throw new Error('pauseContract should set status to PAUSED');
  }

  await controller.resumeContract(reqTenant, contractId, user);
  const resumed = contracts.find((c) => c.id === contractId);
  if (!resumed || resumed.status !== 'ACTIVE') {
    throw new Error('resumeContract should set status back to ACTIVE');
  }

  await controller.cancelContract(reqTenant, contractId, user);
  const canceled = contracts.find((c) => c.id === contractId);
  if (!canceled || canceled.status !== 'CANCELED') {
    throw new Error('cancelContract should set status to CANCELED');
  }

  let invalidPause = false;
  try {
    await controller.pauseContract(reqTenant, contractId, user);
  } catch (error) {
    invalidPause = error instanceof BadRequestException;
  }
  if (!invalidPause) {
    throw new Error('pauseContract should reject pausing a canceled contract');
  }

  // ---- Link students ----
  const contractForStudentsResult = await controller.createContract(
    reqTenant,
    {
      name: 'Mensalidade 2026 - Turma A',
      amountCents: 80000,
      currency: 'BRL',
      dueDay: 12,
      startDate: new Date('2026-02-01').toISOString(),
    },
    user,
  );
  const contractForStudentsId = contractForStudentsResult.contract.id;

  await controller.addStudents(
    reqTenant,
    contractForStudentsId,
    { studentIds: [studentA.id] },
    user,
  );

  if (
    !contractStudents.some(
      (cs) => cs.contractId === contractForStudentsId && cs.studentId === studentA.id,
    )
  ) {
    throw new Error('addStudents should create contract_student link');
  }

  let invalidStudentError = false;
  try {
    await controller.addStudents(
      reqTenant,
      contractForStudentsId,
      { studentIds: [studentOtherTenant.id] },
      user,
    );
  } catch (error) {
    invalidStudentError = error instanceof BadRequestException;
  }
  if (!invalidStudentError) {
    throw new Error('addStudents should reject students from another tenant');
  }

  // ---- Remove student ----
  await controller.removeStudent(reqTenant, contractForStudentsId, studentA.id, user);
  if (
    contractStudents.some(
      (cs) => cs.contractId === contractForStudentsId && cs.studentId === studentA.id,
    )
  ) {
    throw new Error('removeStudent should delete contract_student link');
  }

  // Remove with invalid student should throw BadRequestException
  let invalidRemoveError = false;
  try {
    await controller.removeStudent(reqTenant, contractForStudentsId, studentOtherTenant.id, user);
  } catch (error) {
    invalidRemoveError = error instanceof BadRequestException;
  }
  if (!invalidRemoveError) {
    throw new Error('removeStudent should reject student from another tenant');
  }

  // ---- Not found contract ----
  let notFoundError = false;
  try {
    await controller.updateContract(
      reqTenant,
      'non-existent',
      { name: 'X' },
      user,
    );
  } catch (error) {
    notFoundError = error instanceof NotFoundException;
  }
  if (!notFoundError) {
    throw new Error('updateContract should throw NotFoundException for missing contract');
  }

  console.log('ContractsController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

