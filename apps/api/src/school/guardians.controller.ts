import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { LinkGuardianStudentDto } from './dto/link-guardian-student.dto';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type GuardianStatus = 'ACTIVE' | 'INACTIVE';

const ALLOWED_STATUSES: GuardianStatus[] = ['ACTIVE', 'INACTIVE'];

function parseGuardianStatus(value?: string): GuardianStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (ALLOWED_STATUSES.includes(upper as GuardianStatus)) {
    return upper as GuardianStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid guardian status',
  });
}

function parsePageParams(pageParam?: string, pageSizeParam?: string) {
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const pageSizeRaw = parseInt(pageSizeParam ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  return { page, pageSize };
}

@Controller('school/guardians')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class GuardiansController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService
  ) {}

  @Get()
  @Roles('SCHOOL_ADMIN', 'SECRETARY', 'READONLY')
  async listGuardians(
    @Req() req: TenantRequest,
    @Query('status') statusParam?: string,
    @Query('q') searchQuery?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, limitParam);
    const status = parseGuardianStatus(statusParam);

    const where: {
      tenantId: string;
      status?: GuardianStatus;
      name?: { contains: string; mode: 'insensitive' };
    } = { tenantId };

    if (status) {
      where.status = status;
    }

    const q = searchQuery?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guardian.count({ where }),
      this.prisma.guardian.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              email: true,
              emailVerified: true,
              status: true,
            },
          },
          students: {
            select: {
              studentId: true,
            },
          },
        },
      }),
    ]);

    const guardians = items.map((guardian) => ({
      ...guardian,
      studentIds: guardian.students.map((s) => s.studentId),
    }));

    return {
      items: guardians,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  @Get('pending')
  @Roles('SCHOOL_ADMIN', 'SECRETARY', 'READONLY')
  async listPendingGuardians(
    @Req() req: TenantRequest,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, limitParam);

    const where = {
      tenantId,
      user: {
        status: 'PENDING_APPROVAL' as const,
      },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.guardian.count({ where }),
      this.prisma.guardian.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              email: true,
              emailVerified: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async createGuardian(@Req() req: TenantRequest, @Body() dto: CreateGuardianDto) {
    const tenantId = req.tenant!.id;

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    const phone = dto.phone.trim();
    if (!phone) {
      throw new BadRequestException({
        code: 'invalid_phone',
        message: 'Phone is required',
      });
    }

    let userId: string | null = null;

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, type: true },
      });

      if (!user) {
        throw new BadRequestException({
          code: 'user_not_found',
          message: 'User not found for guardian',
        });
      }

      userId = user.id;
    } else if (dto.userEmail) {
      const email = dto.userEmail.trim().toLowerCase();
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, type: true },
      });

      if (!user) {
        throw new BadRequestException({
          code: 'user_not_found',
          message: 'User not found for guardian',
        });
      }

      userId = user.id;
    } else {
      throw new BadRequestException({
        code: 'user_required',
        message: 'Either userId or userEmail must be provided',
      });
    }

    // It is recommended that the underlying user is of type GUARDIAN,
    // but we do not hard-enforce it here to keep flows flexible.

    const status: GuardianStatus = (dto.status as GuardianStatus | undefined) ?? 'ACTIVE';

    try {
      const guardian = await this.prisma.guardian.create({
        data: {
          tenantId,
          userId,
          name,
          phone,
          status,
        },
      });

      return { guardian };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'guardian_duplicate',
          message: 'Guardian already exists for this user in this tenant',
        });
      }
      throw error;
    }
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async updateGuardian(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateGuardianDto
  ) {
    const tenantId = req.tenant!.id;

    const existing = await this.prisma.guardian.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    const data: { name?: string; phone?: string; status?: GuardianStatus } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException({
          code: 'invalid_name',
          message: 'Name is required',
        });
      }
      data.name = name;
    }

    if (dto.phone !== undefined) {
      const phone = dto.phone.trim();
      if (!phone) {
        throw new BadRequestException({
          code: 'invalid_phone',
          message: 'Phone is required',
        });
      }
      data.phone = phone;
    }

    if (dto.status !== undefined) {
      const status = parseGuardianStatus(dto.status);
      if (!status) {
        throw new BadRequestException({
          code: 'invalid_status',
          message: 'Invalid guardian status',
        });
      }
      data.status = status;
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException({
        code: 'no_changes',
        message: 'No fields to update',
      });
    }

    const guardian = await this.prisma.guardian.update({
      where: { id },
      data,
    });

    return { guardian };
  }

  @Delete(':id')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async deleteGuardian(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    const result = await this.prisma.guardian.deleteMany({
      where: { id, tenantId },
    });

    if (result.count === 0) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    return { success: true };
  }

  @Post(':id/students')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async linkStudent(
    @Req() req: TenantRequest,
    @Param('id') guardianId: string,
    @Body() dto: LinkGuardianStudentDto
  ) {
    const tenantId = req.tenant!.id;

    const guardian = await this.prisma.guardian.findFirst({
      where: { id: guardianId, tenantId },
      select: { id: true },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new BadRequestException({
        code: 'invalid_student',
        message: 'Student does not exist for this tenant',
      });
    }

    try {
      const link = await this.prisma.guardianStudent.create({
        data: {
          guardianId: guardian.id,
          studentId: student.id,
        },
      });

      return { link };
    } catch (error) {
      if ((error as { code?: string } | null | undefined)?.code === 'P2002') {
        throw new ConflictException({
          code: 'guardian_student_duplicate',
          message: 'Guardian already linked to this student',
        });
      }
      throw error;
    }
  }

  @Delete(':id/students/:studentId')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async unlinkStudent(
    @Req() req: TenantRequest,
    @Param('id') guardianId: string,
    @Param('studentId') studentId: string
  ) {
    const tenantId = req.tenant!.id;

    const guardian = await this.prisma.guardian.findFirst({
      where: { id: guardianId, tenantId },
      select: { id: true },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    const result = await this.prisma.guardianStudent.deleteMany({
      where: { guardianId: guardian.id, studentId },
    });

    if (result.count === 0) {
      throw new NotFoundException({
        code: 'guardian_student_not_found',
        message: 'Guardian is not linked to this student',
      });
    }

    return { success: true };
  }

  @Post(':id/approve')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async approveGuardian(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() actor: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const guardian = await this.prisma.guardian.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
      },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    if (guardian.user.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'Guardian is not pending approval',
      });
    }

    if (!guardian.user.emailVerified) {
      throw new BadRequestException({
        code: 'email_not_verified',
        message: 'Guardian email must be verified before approval',
      });
    }

    await this.prisma.user.update({
      where: { id: guardian.userId },
      data: { status: 'ACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: actor.id,
      actorType: 'USER',
      action: 'guardian.approve',
      targetType: 'user',
      targetId: guardian.userId,
      metadata: {
        guardianId: guardian.id,
        guardianEmail: guardian.user.email,
      },
    });

    await this.emailService.sendGuardianApprovalEmail(guardian.user.email);

    return { success: true };
  }

  @Post(':id/reject')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async rejectGuardian(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() actor: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const guardian = await this.prisma.guardian.findFirst({
      where: { id, tenantId },
      include: {
        user: true,
      },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    await this.prisma.user.update({
      where: { id: guardian.userId },
      data: { status: 'REJECTED' },
    });

    await this.prisma.guardian.update({
      where: { id: guardian.id },
      data: { status: 'INACTIVE' },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: actor.id,
      actorType: 'USER',
      action: 'guardian.reject',
      targetType: 'user',
      targetId: guardian.userId,
      metadata: {
        guardianId: guardian.id,
        guardianEmail: guardian.user.email,
      },
    });

    await this.emailService.sendGuardianRejectionEmail(guardian.user.email);

    return { success: true };
  }
}
