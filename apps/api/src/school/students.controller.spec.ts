import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { PrismaService } from '../prisma/prisma.service';

type GradeEntity = {
  id: string;
  tenantId: string;
  name: string;
};

type ClassEntity = {
  id: string;
  tenantId: string;
  gradeId: string;
  name: string;
};

type StudentEntity = {
  id: string;
  tenantId: string;
  classId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
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
  const grades: GradeEntity[] = [];
  const classes: ClassEntity[] = [];
  const students: StudentEntity[] = [];

  let counter = 0;
  const nextId = () => `id-${++counter}`;

  const prismaMock = {
    grade: {
      findFirst: async (args: { where: { id?: string; tenantId?: string }; select?: { id: true } }) => {
        const { id, tenantId } = args.where;
        const grade = grades.find(
          (g) => (id === undefined || g.id === id) && (tenantId === undefined || g.tenantId === tenantId)
        );
        if (!grade) return null;
        if (args.select?.id) return { id: grade.id };
        return grade;
      },
    },
    class: {
      findFirst: async (args: { where: { id?: string; tenantId?: string }; select?: { id: true } }) => {
        const { id, tenantId } = args.where;
        const classEntity = classes.find(
          (c) =>
            (id === undefined || c.id === id) &&
            (tenantId === undefined || c.tenantId === tenantId)
        );
        if (!classEntity) return null;
        if (args.select?.id) return { id: classEntity.id };
        return classEntity;
      },
    },
    student: {
      count: async (args: {
        where: {
          tenantId: string;
          classId?: string;
          status?: 'ACTIVE' | 'INACTIVE';
          name?: { contains: string; mode: 'insensitive' };
        };
      }) => {
        const { tenantId, classId, status, name } = args.where;
        return students.filter((s) => {
          if (s.tenantId !== tenantId) return false;
          if (classId && s.classId !== classId) return false;
          if (status && s.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!s.name.toLowerCase().includes(q)) return false;
          }
          return true;
        }).length;
      },
      findMany: async (args: {
        where: {
          tenantId: string;
          classId?: string;
          status?: 'ACTIVE' | 'INACTIVE';
          name?: { contains: string; mode: 'insensitive' };
        };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        const { tenantId, classId, status, name } = args.where;
        const skip = args.skip ?? 0;
        const take = args.take ?? students.length;

        const filtered = students.filter((s) => {
          if (s.tenantId !== tenantId) return false;
          if (classId && s.classId !== classId) return false;
          if (status && s.status !== status) return false;
          if (name) {
            const q = name.contains.toLowerCase();
            if (!s.name.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        const ordered =
          (args.orderBy?.createdAt ?? 'desc') === 'desc'
            ? [...filtered].reverse()
            : filtered;

        return ordered.slice(skip, skip + take);
      },
      create: async (args: {
        data: {
          tenantId: string;
          classId: string;
          name: string;
          status: 'ACTIVE' | 'INACTIVE';
        };
      }) => {
        const exists = students.some(
          (s) =>
            s.tenantId === args.data.tenantId &&
            s.classId === args.data.classId &&
            s.name === args.data.name
        );
        if (exists) {
          const error = new Error('Unique') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const student: StudentEntity = {
          id: nextId(),
          tenantId: args.data.tenantId,
          classId: args.data.classId,
          name: args.data.name,
          status: args.data.status,
        };
        students.push(student);
        return student;
      },
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
      update: async (args: {
        where: { id: string };
        data: { name?: string; classId?: string; status?: 'ACTIVE' | 'INACTIVE' };
      }) => {
        const student = students.find((s) => s.id === args.where.id);
        if (!student) {
          throw new Error('Not found');
        }

        const nextName = args.data.name ?? student.name;
        const nextClassId = args.data.classId ?? student.classId;

        if (nextName !== student.name || nextClassId !== student.classId) {
          const exists = students.some(
            (s) =>
              s.id !== student.id &&
              s.tenantId === student.tenantId &&
              s.classId === nextClassId &&
              s.name === nextName
          );
          if (exists) {
            const error = new Error('Unique') as Error & { code?: string };
            error.code = 'P2002';
            throw error;
          }
        }

        if (args.data.name) {
          student.name = args.data.name;
        }
        if (args.data.classId) {
          student.classId = args.data.classId;
        }
        if (args.data.status) {
          student.status = args.data.status;
        }
        return student;
      },
      deleteMany: async (args: { where: { id: string; tenantId: string } }) => {
        const before = students.length;
        for (let i = students.length - 1; i >= 0; i -= 1) {
          if (
            students[i].id === args.where.id &&
            students[i].tenantId === args.where.tenantId
          ) {
            students.splice(i, 1);
          }
        }
        const count = before - students.length;
        return { count };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) =>
      Promise.all(operations),
  } as unknown as PrismaService;

  const controller = new StudentsController(prismaMock);

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';

  const gradeId = nextId();
  const classId = nextId();
  grades.push({ id: gradeId, tenantId, name: '1º ano' });
  classes.push({ id: classId, tenantId, gradeId, name: '1ºA' });

  const otherGradeId = nextId();
  const otherClassId = nextId();
  grades.push({ id: otherGradeId, tenantId: otherTenantId, name: '2º ano' });
  classes.push({ id: otherClassId, tenantId: otherTenantId, gradeId: otherGradeId, name: '2ºB' });

  const reqTenant = createTenantRequest(tenantId) as TenantRequest;

  // Create student
  const studentName = 'Ana Silva';
  const created = await controller.createStudent(reqTenant, {
    name: studentName,
    classId,
  });
  if (!created.student || created.student.name !== studentName) {
    throw new Error('createStudent should return created student');
  }

  // Duplicate should throw ConflictException
  let duplicateError = false;
  try {
    await controller.createStudent(reqTenant, { name: studentName, classId });
  } catch (error) {
    duplicateError = error instanceof ConflictException;
  }
  if (!duplicateError) {
    throw new Error('createStudent should reject duplicate name in same class');
  }

  // Invalid class for tenant -> invalid_class
  let invalidClassError = false;
  try {
    await controller.createStudent(reqTenant, { name: 'Other', classId: otherClassId });
  } catch (error) {
    invalidClassError = error instanceof BadRequestException;
  }
  if (!invalidClassError) {
    throw new Error('createStudent should reject class from another tenant');
  }

  // List students tenant-scoped and filtered
  const otherReq = createTenantRequest(otherTenantId) as TenantRequest;
  await controller.createStudent(otherReq, {
    name: 'Outro aluno',
    classId: otherClassId,
  });

  const listTenant1 = await controller.listStudents(reqTenant, classId, 'ACTIVE', 'Ana', '1', '10');
  if (listTenant1.total !== 1 || listTenant1.items[0].tenantId !== tenantId) {
    throw new Error('listStudents should respect tenant, class, status and q filters');
  }

  // Update student: name and status
  const studentId = created.student.id;
  const updated = await controller.updateStudent(reqTenant, studentId, {
    name: 'Ana Souza',
    status: 'INACTIVE',
  });
  if (updated.student.name !== 'Ana Souza' || updated.student.status !== 'INACTIVE') {
    throw new Error('updateStudent should update name and status');
  }

  // Update with invalid class for tenant -> invalid_class
  let invalidClassOnUpdate = false;
  try {
    await controller.updateStudent(reqTenant, studentId, { classId: otherClassId });
  } catch (error) {
    invalidClassOnUpdate = error instanceof BadRequestException;
  }
  if (!invalidClassOnUpdate) {
    throw new Error('updateStudent should reject moving to class from another tenant');
  }

  // Update duplicate name within same class should ConflictException
  const second = await controller.createStudent(reqTenant, {
    name: 'Bruno',
    classId,
  });
  let duplicateOnUpdate = false;
  try {
    await controller.updateStudent(reqTenant, second.student.id, { name: 'Ana Souza' });
  } catch (error) {
    duplicateOnUpdate = error instanceof ConflictException;
  }
  if (!duplicateOnUpdate) {
    throw new Error('updateStudent should reject duplicate name in same class');
  }

  // Update with empty payload -> no_changes
  let noChangesError = false;
  try {
    await controller.updateStudent(reqTenant, studentId, {});
  } catch (error) {
    noChangesError = error instanceof BadRequestException;
  }
  if (!noChangesError) {
    throw new Error('updateStudent should reject empty payload');
  }

  // Delete student success and not-found
  const deleteResult = await controller.deleteStudent(reqTenant, studentId);
  if (!deleteResult.success) {
    throw new Error('deleteStudent should return success true');
  }

  let notFound = false;
  try {
    await controller.deleteStudent(reqTenant, studentId);
  } catch (error) {
    notFound = error instanceof NotFoundException;
  }
  if (!notFound) {
    throw new Error('deleteStudent should throw NotFoundException when student does not exist');
  }

  console.log('StudentsController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
