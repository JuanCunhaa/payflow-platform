import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GuardiansController } from './guardians.controller';
import { PrismaService } from '../prisma/prisma.service';

type GuardianEntity = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type StudentEntity = {
  id: string;
  tenantId: string;
  classId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type GuardianStudentEntity = {
  id: string;
  guardianId: string;
  studentId: string;
};

type UserEntity = {
  id: string;
  type: 'PLATFORM' | 'STAFF' | 'GUARDIAN';
};

type TenantRequest = {
  tenant?: { id: string; slug: string };
};

function createTenantRequest(tenantId: string): TenantRequest {
  return {
    tenant: { id: tenantId, slug: 'tenant-slug' },
  };
}

async function run() {
  const guardians: GuardianEntity[] = [];
  const students: StudentEntity[] = [];
  const guardianStudents: GuardianStudentEntity[] = [];
  const users: UserEntity[] = [];

  let counter = 0;
  const nextId = () => `id-${++counter}`;

  const prismaMock = {
    user: {
      findUnique: async (args: { where: { id: string }; select?: { id: true; type: true } }) => {
        const user = users.find((u) => u.id === args.where.id);
        if (!user) return null;
        if (args.select?.id || args.select?.type) {
          return {
            id: user.id,
            type: user.type,
          };
        }
        return user;
      },
    },
    guardian: {
      count: async (args: {
        where: {
          tenantId: string;
          status?: 'ACTIVE' | 'INACTIVE';
          name?: { contains: string; mode: 'insensitive' };
        };
      }) => {
        const { tenantId, status, name } = args.where;
        return guardians.filter((g) => {
          if (g.tenantId !== tenantId) return false;
          if (status && g.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!g.name.toLowerCase().includes(q)) return false;
          }
          return true;
        }).length;
      },
      findMany: async (args: {
        where: {
          tenantId: string;
          status?: 'ACTIVE' | 'INACTIVE';
          name?: { contains: string; mode: 'insensitive' };
        };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
        include?: { students?: { select: { studentId: true } } };
      }) => {
        const { tenantId, status, name } = args.where;
        const skip = args.skip ?? 0;
        const take = args.take ?? guardians.length;

        const filtered = guardians.filter((g) => {
          if (g.tenantId !== tenantId) return false;
          if (status && g.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!g.name.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        const ordered =
          (args.orderBy?.createdAt ?? 'desc') === 'desc'
            ? [...filtered].reverse()
            : filtered;

        return ordered.slice(skip, skip + take).map((guardian) => ({
          ...guardian,
          students: guardianStudents
            .filter((gs) => gs.guardianId === guardian.id)
            .map((gs) => ({ studentId: gs.studentId })),
        }));
      },
      create: async (args: {
        data: {
          tenantId: string;
          userId: string;
          name: string;
          phone: string;
          status: 'ACTIVE' | 'INACTIVE';
        };
      }) => {
        const exists = guardians.some(
          (g) => g.tenantId === args.data.tenantId && g.userId === args.data.userId
        );
        if (exists) {
          const error = new Error('Unique') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const guardian: GuardianEntity = {
          id: nextId(),
          tenantId: args.data.tenantId,
          userId: args.data.userId,
          name: args.data.name,
          phone: args.data.phone,
          status: args.data.status,
        };
        guardians.push(guardian);
        return guardian;
      },
      findFirst: async (args: {
        where: { id?: string; tenantId?: string };
        select?: { id: true };
      }) => {
        const { id, tenantId } = args.where;
        const guardian = guardians.find(
          (g) =>
            (id === undefined || g.id === id) &&
            (tenantId === undefined || g.tenantId === tenantId)
        );
        if (!guardian) return null;
        if (args.select?.id) return { id: guardian.id };
        return guardian;
      },
      update: async (args: {
        where: { id: string };
        data: { name?: string; phone?: string; status?: 'ACTIVE' | 'INACTIVE' };
      }) => {
        const guardian = guardians.find((g) => g.id === args.where.id);
        if (!guardian) {
          throw new Error('Not found');
        }
        if (args.data.name !== undefined) {
          guardian.name = args.data.name;
        }
        if (args.data.phone !== undefined) {
          guardian.phone = args.data.phone;
        }
        if (args.data.status !== undefined) {
          guardian.status = args.data.status;
        }
        return guardian;
      },
      deleteMany: async (args: { where: { id: string; tenantId: string } }) => {
        const { id, tenantId } = args.where;
        const before = guardians.length;
        for (let i = guardians.length - 1; i >= 0; i -= 1) {
          if (guardians[i].id === id && guardians[i].tenantId === tenantId) {
            guardians.splice(i, 1);
          }
        }
        const count = before - guardians.length;
        return { count };
      },
    },
    student: {
      findFirst: async (args: {
        where: { id?: string; tenantId?: string };
        select?: { id: true };
      }) => {
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
    guardianStudent: {
      create: async (args: {
        data: { guardianId: string; studentId: string };
      }) => {
        const exists = guardianStudents.some(
          (gs) =>
            gs.guardianId === args.data.guardianId &&
            gs.studentId === args.data.studentId
        );
        if (exists) {
          const error = new Error('Unique') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const link: GuardianStudentEntity = {
          id: nextId(),
          guardianId: args.data.guardianId,
          studentId: args.data.studentId,
        };
        guardianStudents.push(link);
        return link;
      },
      deleteMany: async (args: {
        where: { guardianId: string; studentId: string };
      }) => {
        const { guardianId, studentId } = args.where;
        const before = guardianStudents.length;
        for (let i = guardianStudents.length - 1; i >= 0; i -= 1) {
          if (
            guardianStudents[i].guardianId === guardianId &&
            guardianStudents[i].studentId === studentId
          ) {
            guardianStudents.splice(i, 1);
          }
        }
        const count = before - guardianStudents.length;
        return { count };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  } as unknown as PrismaService;

  const controller = new GuardiansController(prismaMock);

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';
  const guardianUserId = nextId();
  const otherUserId = nextId();

  users.push({ id: guardianUserId, type: 'GUARDIAN' });
  users.push({ id: otherUserId, type: 'GUARDIAN' });

  const classId = nextId();
  const studentId = nextId();
  students.push({
    id: studentId,
    tenantId,
    classId,
    name: 'Aluno 1',
    status: 'ACTIVE',
  });

  const otherClassId = nextId();
  const otherStudentId = nextId();
  students.push({
    id: otherStudentId,
    tenantId: otherTenantId,
    classId: otherClassId,
    name: 'Aluno 2',
    status: 'ACTIVE',
  });

  const reqTenant = createTenantRequest(tenantId) as TenantRequest;

  // Create guardian
  const created = await controller.createGuardian(reqTenant, {
    name: 'Responsável 1',
    phone: '11999999999',
    userId: guardianUserId,
  });
  if (!created.guardian || created.guardian.name !== 'Responsável 1') {
    throw new Error('createGuardian should return created guardian');
  }

  // Duplicate guardian (same user + tenant) -> ConflictException
  let duplicateError = false;
  try {
    await controller.createGuardian(reqTenant, {
      name: 'Responsável 1',
      phone: '11999999999',
      userId: guardianUserId,
    });
  } catch (error) {
    duplicateError = error instanceof ConflictException;
  }
  if (!duplicateError) {
    throw new Error('createGuardian should reject duplicate guardian per user/tenant');
  }

  // Invalid user on create -> BadRequestException
  let invalidUserError = false;
  try {
    await controller.createGuardian(reqTenant, {
      name: 'Outro',
      phone: '11988888888',
      userId: 'non-existent',
    });
  } catch (error) {
    invalidUserError = error instanceof BadRequestException;
  }
  if (!invalidUserError) {
    throw new Error('createGuardian should reject unknown user');
  }

  // List guardians with filter
  const list = await controller.listGuardians(reqTenant, 'ACTIVE', 'Responsável', '1', '10');
  if (list.total !== 1 || list.items[0].tenantId !== tenantId) {
    throw new Error('listGuardians should filter by tenant and status');
  }

  const guardianId = created.guardian.id;

  // Update guardian
  const updated = await controller.updateGuardian(reqTenant, guardianId, {
    name: 'Responsável Atualizado',
    phone: '11977777777',
    status: 'INACTIVE',
  });
  if (
    updated.guardian.name !== 'Responsável Atualizado' ||
    updated.guardian.phone !== '11977777777' ||
    updated.guardian.status !== 'INACTIVE'
  ) {
    throw new Error('updateGuardian should update fields');
  }

  // Update with empty payload -> no_changes
  let noChangesError = false;
  try {
    await controller.updateGuardian(reqTenant, guardianId, {});
  } catch (error) {
    noChangesError = error instanceof BadRequestException;
  }
  if (!noChangesError) {
    throw new Error('updateGuardian should reject empty payload');
  }

  // Link student to guardian
  const linkResult = await controller.linkStudent(reqTenant, guardianId, {
    studentId,
  });
  if (!linkResult.link || linkResult.link.guardianId !== guardianId) {
    throw new Error('linkStudent should create guardian-student link');
  }

  // Duplicate link -> ConflictException
  let duplicateLinkError = false;
  try {
    await controller.linkStudent(reqTenant, guardianId, {
      studentId,
    });
  } catch (error) {
    duplicateLinkError = error instanceof ConflictException;
  }
  if (!duplicateLinkError) {
    throw new Error('linkStudent should reject duplicate link');
  }

  // Link student from another tenant -> invalid_student
  let invalidStudentLinkError = false;
  try {
    await controller.linkStudent(reqTenant, guardianId, {
      studentId: otherStudentId,
    });
  } catch (error) {
    invalidStudentLinkError = error instanceof BadRequestException;
  }
  if (!invalidStudentLinkError) {
    throw new Error('linkStudent should reject student from other tenant');
  }

  // Unlink student success and not-found
  const unlinkResult = await controller.unlinkStudent(reqTenant, guardianId, studentId);
  if (!unlinkResult.success) {
    throw new Error('unlinkStudent should return success true');
  }

  let unlinkNotFound = false;
  try {
    await controller.unlinkStudent(reqTenant, guardianId, studentId);
  } catch (error) {
    unlinkNotFound = error instanceof NotFoundException;
  }
  if (!unlinkNotFound) {
    throw new Error('unlinkStudent should throw NotFoundException for missing link');
  }

  // Delete guardian success and not-found
  const deleteResult = await controller.deleteGuardian(reqTenant, guardianId);
  if (!deleteResult.success) {
    throw new Error('deleteGuardian should return success true');
  }

  let deleteNotFound = false;
  try {
    await controller.deleteGuardian(reqTenant, guardianId);
  } catch (error) {
    deleteNotFound = error instanceof NotFoundException;
  }
  if (!deleteNotFound) {
    throw new Error('deleteGuardian should throw NotFoundException for missing guardian');
  }

  // List from other tenant should be empty
  const otherReq = createTenantRequest(otherTenantId) as TenantRequest;
  const listOther = await controller.listGuardians(otherReq, undefined, undefined, '1', '10');
  if (listOther.total !== 0) {
    throw new Error('listGuardians should be tenant-scoped');
  }

  // eslint-disable-next-line no-console
  console.log('GuardiansController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

