import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { GradesClassesController } from './grades-classes.controller';
import { PrismaService } from '../prisma/prisma.service';

type GradeEntity = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

type ClassEntity = {
  id: string;
  tenantId: string;
  gradeId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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

  let idCounter = 0;
  const nextId = () => `id-${++idCounter}`;

  const prismaMock = {
    grade: {
      count: async (args: { where: { tenantId: string } }) =>
        grades.filter((g) => g.tenantId === args.where.tenantId).length,
      findMany: async (args: {
        where: { tenantId: string };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        const { tenantId } = args.where;
        const skip = args.skip ?? 0;
        const take = args.take ?? grades.length;
        const ordered = [...grades]
          .filter((g) => g.tenantId === tenantId)
          .sort((a, b) =>
            (args.orderBy?.createdAt ?? 'desc') === 'desc'
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : a.createdAt.getTime() - b.createdAt.getTime()
          );
        return ordered.slice(skip, skip + take);
      },
      create: async (args: { data: { tenantId: string; name: string } }) => {
        const exists = grades.some(
          (g) => g.tenantId === args.data.tenantId && g.name === args.data.name
        );
        if (exists) {
          const error = new Error('Unique constraint') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const now = new Date();
        const grade: GradeEntity = {
          id: nextId(),
          tenantId: args.data.tenantId,
          name: args.data.name,
          createdAt: now,
          updatedAt: now,
        };
        grades.push(grade);
        return grade;
      },
      update: async (args: { where: { id: string }; data: { name?: string } }) => {
        const { id } = args.where;
        const grade = grades.find((g) => g.id === id);
        if (!grade) {
          const error = new Error('Not found');
          throw error;
        }
        if (args.data.name && args.data.name !== grade.name) {
          const exists = grades.some(
            (g) => g.tenantId === grade.tenantId && g.name === args.data.name && g.id !== id
          );
          if (exists) {
            const error = new Error('Unique constraint') as Error & { code?: string };
            error.code = 'P2002';
            throw error;
          }
        }
        if (args.data.name) {
          grade.name = args.data.name;
        }
        grade.updatedAt = new Date();
        return grade;
      },
      deleteMany: async (args: { where: { id: string; tenantId: string } }) => {
        const { id, tenantId } = args.where;
        const before = grades.length;
        for (let i = grades.length - 1; i >= 0; i -= 1) {
          if (grades[i].id === id && grades[i].tenantId === tenantId) {
            grades.splice(i, 1);
          }
        }
        const count = before - grades.length;
        return { count };
      },
      findFirst: async (args: {
        where: { id?: string; tenantId?: string };
        select?: { id: true };
      }) => {
        const { id, tenantId } = args.where;
        const found = grades.find(
          (g) =>
            (id === undefined || g.id === id) && (tenantId === undefined || g.tenantId === tenantId)
        );
        if (!found) return null;
        if (args.select?.id) {
          return { id: found.id };
        }
        return found;
      },
    },
    class: {
      count: async (args: { where: { tenantId: string; gradeId?: string } }) =>
        classes.filter(
          (c) =>
            c.tenantId === args.where.tenantId &&
            (args.where.gradeId === undefined || c.gradeId === args.where.gradeId)
        ).length,
      findMany: async (args: {
        where: { tenantId: string; gradeId?: string };
        orderBy?: { createdAt?: 'asc' | 'desc' };
        skip?: number;
        take?: number;
      }) => {
        const { tenantId, gradeId } = args.where;
        const skip = args.skip ?? 0;
        const take = args.take ?? classes.length;
        const ordered = [...classes]
          .filter(
            (c) => c.tenantId === tenantId && (gradeId === undefined || c.gradeId === gradeId)
          )
          .sort((a, b) =>
            (args.orderBy?.createdAt ?? 'desc') === 'desc'
              ? b.createdAt.getTime() - a.createdAt.getTime()
              : a.createdAt.getTime() - b.createdAt.getTime()
          );
        return ordered.slice(skip, skip + take);
      },
      create: async (args: { data: { tenantId: string; gradeId: string; name: string } }) => {
        const exists = classes.some(
          (c) => c.tenantId === args.data.tenantId && c.name === args.data.name
        );
        if (exists) {
          const error = new Error('Unique constraint') as Error & { code?: string };
          error.code = 'P2002';
          throw error;
        }
        const now = new Date();
        const classEntity: ClassEntity = {
          id: nextId(),
          tenantId: args.data.tenantId,
          gradeId: args.data.gradeId,
          name: args.data.name,
          createdAt: now,
          updatedAt: now,
        };
        classes.push(classEntity);
        return classEntity;
      },
      update: async (args: {
        where: { id: string };
        data: { name?: string; gradeId?: string };
      }) => {
        const { id } = args.where;
        const classEntity = classes.find((c) => c.id === id);
        if (!classEntity) {
          const error = new Error('Not found');
          throw error;
        }

        const newName = args.data.name ?? classEntity.name;
        if (newName !== classEntity.name) {
          const exists = classes.some(
            (c) => c.tenantId === classEntity.tenantId && c.name === newName && c.id !== id
          );
          if (exists) {
            const error = new Error('Unique constraint') as Error & { code?: string };
            error.code = 'P2002';
            throw error;
          }
        }

        if (args.data.name) {
          classEntity.name = args.data.name;
        }
        if (args.data.gradeId) {
          classEntity.gradeId = args.data.gradeId;
        }
        classEntity.updatedAt = new Date();
        return classEntity;
      },
      findFirst: async (args: {
        where: { id?: string; tenantId?: string };
        select?: { id: true };
      }) => {
        const { id, tenantId } = args.where;
        const found = classes.find(
          (c) =>
            (id === undefined || c.id === id) && (tenantId === undefined || c.tenantId === tenantId)
        );
        if (!found) return null;
        if (args.select?.id) {
          return { id: found.id };
        }
        return found;
      },
      deleteMany: async (args: { where: { id: string; tenantId: string } }) => {
        const { id, tenantId } = args.where;
        const before = classes.length;
        for (let i = classes.length - 1; i >= 0; i -= 1) {
          if (classes[i].id === id && classes[i].tenantId === tenantId) {
            classes.splice(i, 1);
          }
        }
        const count = before - classes.length;
        return { count };
      },
    },
    $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
  } as unknown as PrismaService;

  const controller = new GradesClassesController(prismaMock);

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';

  // ---- Create grade ----
  const reqTenant = createTenantRequest(tenantId);

  const createdGradeResult = await controller.createGrade(reqTenant, { name: '1º ano' });
  if (!createdGradeResult.grade || createdGradeResult.grade.name !== '1º ano') {
    throw new Error('createGrade should return created grade');
  }

  // Duplicate grade name for same tenant -> 409
  let duplicateErrorCaught = false;
  try {
    await controller.createGrade(reqTenant, { name: '1º ano' });
  } catch (error) {
    duplicateErrorCaught = error instanceof ConflictException;
    if (error instanceof ConflictException) {
      const response = error.getResponse() as { code?: string };
      if (response.code !== 'grade_duplicate') {
        throw new Error('grade_duplicate error code expected');
      }
    }
  }
  if (!duplicateErrorCaught) {
    throw new Error('createGrade should throw ConflictException for duplicate name');
  }

  // ---- List grades tenant-scoped ----
  const otherReq = createTenantRequest(otherTenantId);
  await controller.createGrade(otherReq, { name: '2º ano' });

  const listTenant1 = await controller.listGrades(reqTenant, '1', '10');
  if (listTenant1.total !== 1 || listTenant1.items[0].tenantId !== tenantId) {
    throw new Error('listGrades should be scoped by tenant');
  }

  // ---- Update grade ----
  const gradeId = createdGradeResult.grade.id;
  const updatedGrade = await controller.updateGrade(reqTenant, gradeId, {
    name: '1º ano A',
  });
  if (updatedGrade.grade.name !== '1º ano A') {
    throw new Error('updateGrade should update name');
  }

  // Update with empty payload -> 400
  let noChangesError = false;
  try {
    await controller.updateGrade(reqTenant, gradeId, {});
  } catch (error) {
    noChangesError = error instanceof BadRequestException;
    if (error instanceof BadRequestException) {
      const response = error.getResponse() as { code?: string };
      if (response.code !== 'no_changes') {
        throw new Error('no_changes error code expected for empty update on grade');
      }
    }
  }
  if (!noChangesError) {
    throw new Error('updateGrade should reject empty payload');
  }

  // ---- Delete grade with classes -> blocked ----
  const gradeForClassResult = await controller.createGrade(reqTenant, { name: '2º ano' });
  const gradeForClassId = gradeForClassResult.grade.id;

  const classReq = createTenantRequest(tenantId);
  const createdClassResult = await controller.createClass(classReq, {
    gradeId: gradeForClassId,
    name: '2ºA',
  });
  if (!createdClassResult.class || createdClassResult.class.gradeId !== gradeForClassId) {
    throw new Error('createClass should create class linked to grade');
  }

  let deleteBlocked = false;
  try {
    await controller.deleteGrade(reqTenant, gradeForClassId);
  } catch (error) {
    deleteBlocked = error instanceof BadRequestException;
    if (error instanceof BadRequestException) {
      const response = error.getResponse() as { code?: string };
      if (response.code !== 'grade_has_classes') {
        throw new Error('grade_has_classes error code expected when grade has classes');
      }
    }
  }
  if (!deleteBlocked) {
    throw new Error('deleteGrade should fail when grade has classes');
  }

  // ---- Class validations ----
  // Invalid grade on create
  let invalidGradeError = false;
  try {
    await controller.createClass(classReq, { gradeId: 'non-existent', name: 'X' });
  } catch (error) {
    invalidGradeError = error instanceof BadRequestException;
  }
  if (!invalidGradeError) {
    throw new Error('createClass should reject invalid grade for tenant');
  }

  // Duplicate class name per tenant
  const anotherClass = await controller.createClass(classReq, {
    gradeId: gradeForClassId,
    name: '3ºA',
  });
  if (!anotherClass.class) {
    throw new Error('createClass should create class');
  }

  let duplicateClassErrorCaught = false;
  try {
    await controller.createClass(classReq, {
      gradeId: gradeForClassId,
      name: '3ºA',
    });
  } catch (error) {
    duplicateClassErrorCaught = error instanceof ConflictException;
  }
  if (!duplicateClassErrorCaught) {
    throw new Error('createClass should throw ConflictException for duplicate name');
  }

  // Update class to reference grade from another tenant -> invalid_grade
  const foreignGradeResult = await controller.createGrade(otherReq, { name: '3º ano' });
  let invalidUpdateGradeError = false;
  try {
    await controller.updateClass(classReq, anotherClass.class.id, {
      gradeId: foreignGradeResult.grade.id,
    });
  } catch (error) {
    invalidUpdateGradeError = error instanceof BadRequestException;
  }
  if (!invalidUpdateGradeError) {
    throw new Error('updateClass should reject grade from another tenant');
  }

  // Delete class happy path and not-found
  const classIdToDelete = createdClassResult.class.id;
  const deleteResult = await controller.deleteClass(classReq, classIdToDelete);
  if (!deleteResult.success) {
    throw new Error('deleteClass should return success true');
  }

  let notFoundOnDelete = false;
  try {
    await controller.deleteClass(classReq, classIdToDelete);
  } catch (error) {
    notFoundOnDelete = error instanceof NotFoundException;
  }
  if (!notFoundOnDelete) {
    throw new Error('deleteClass should throw NotFoundException for missing class');
  }

  console.log('GradesClassesController tests passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
