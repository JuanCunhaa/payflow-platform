import { NotFoundException } from '@nestjs/common';
import { GuardianController } from './guardian.controller';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

type GuardianEntity = {
  id: string;
  tenantId: string;
  userId: string;
  name: string;
  phone: string;
};

type ClassEntity = {
  id: string;
  name: string;
};

type StudentEntity = {
  id: string;
  tenantId: string;
  classId: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

type GuardianStudentLink = {
  guardianId: string;
  studentId: string;
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
  const classes: ClassEntity[] = [];
  const students: StudentEntity[] = [];
  const guardianStudentLinks: GuardianStudentLink[] = [];

  let counter = 0;
  const nextId = () => `id-${++counter}`;

  const prismaMock = {
    guardian: {
      findFirst: async (args: { where: { tenantId?: string; userId?: string; id?: string }; include?: any }) => {
        const { tenantId, userId, id } = args.where;
        const guardian = guardians.find((g) => {
          if (tenantId && g.tenantId !== tenantId) return false;
          if (userId && g.userId !== userId) return false;
          if (id && g.id !== id) return false;
          return true;
        });

        if (!guardian) return null;

        if (!args.include) {
          return guardian;
        }

        const withUser =
          args.include.user &&
          args.include.user.select && {
            user: {
              email: 'guardian@example.com',
              name: guardian.name,
            },
          };

        const withStudents =
          args.include.students &&
          args.include.students.include && {
            students: guardianStudentLinks
              .filter((link) => link.guardianId === guardian.id)
              .map((link) => {
                const student = students.find((s) => s.id === link.studentId);
                if (!student) {
                  throw new Error('Student not found for link');
                }
                const studentClass = classes.find((c) => c.id === student.classId);
                if (!studentClass) {
                  throw new Error('Class not found for student');
                }
                return {
                  student: {
                    id: student.id,
                    name: student.name,
                    status: student.status,
                    class: {
                      id: studentClass.id,
                      name: studentClass.name,
                    },
                  },
                };
              }),
          };

        return {
          ...guardian,
          ...(withUser ?? {}),
          ...(withStudents ?? {}),
        };
      },
      update: async (args: { where: { id: string }; data: { name?: string; phone?: string } }) => {
        const guardian = guardians.find((g) => g.id === args.where.id);
        if (!guardian) {
          throw new Error('Guardian not found');
        }
        if (typeof args.data.name === 'string') {
          guardian.name = args.data.name;
        }
        if (typeof args.data.phone === 'string') {
          guardian.phone = args.data.phone;
        }
        return guardian;
      },
    },
  };

  const controller = new GuardianController(prismaMock as unknown as PrismaService);

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const classId = 'class-1';
  const studentId = 'student-1';

  classes.push({ id: classId, name: '1A' });

  students.push({
    id: studentId,
    tenantId,
    classId,
    name: 'Aluno 1',
    status: 'ACTIVE',
  });

  const guardianId = nextId();
  guardians.push({
    id: guardianId,
    tenantId,
    userId,
    name: 'Responsável 1',
    phone: '11999999999',
  });

  guardianStudentLinks.push({
    guardianId,
    studentId,
  });

  const reqTenant = createTenantRequest(tenantId) as TenantRequest;
  const currentUser: CurrentUserPayload = {
    id: userId,
    email: 'guardian@example.com',
    userType: 'GUARDIAN',
    tenantId,
    role: 'GUARDIAN',
  };

  // getMe should return guardian profile with email and phone
  const me = await controller.getMe(reqTenant, currentUser);
  if (me.id !== guardianId || me.email !== 'guardian@example.com') {
    throw new Error('getMe should return guardian profile with email');
  }

  // updateMe should trim and update phone
  const updated = await controller.updateMe(reqTenant, currentUser, {
    phone: ' 11988887777 ',
  });
  if (updated.phone !== '11988887777') {
    throw new Error('updateMe should update and trim phone number');
  }

  // getStudents should return linked students with class info
  const studentsResult = await controller.getStudents(reqTenant, currentUser);
  if (!studentsResult.items || studentsResult.items.length !== 1) {
    throw new Error('getStudents should return one student');
  }
  const first = studentsResult.items[0];
  if (first.name !== 'Aluno 1' || first.class.name !== '1A') {
    throw new Error('getStudents should map student and class correctly');
  }

  // When guardian does not exist, endpoints should throw NotFoundException
  guardians.length = 0;

  let notFoundOnMe = false;
  try {
    await controller.getMe(reqTenant, currentUser);
  } catch (error) {
    notFoundOnMe = error instanceof NotFoundException;
  }
  if (!notFoundOnMe) {
    throw new Error('getMe should throw NotFoundException when guardian is missing');
  }

  let notFoundOnStudents = false;
  try {
    await controller.getStudents(reqTenant, currentUser);
  } catch (error) {
    notFoundOnStudents = error instanceof NotFoundException;
  }
  if (!notFoundOnStudents) {
    throw new Error('getStudents should throw NotFoundException when guardian is missing');
  }

  // eslint-disable-next-line no-console
  console.log('GuardianController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

