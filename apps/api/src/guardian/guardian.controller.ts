import { Body, Controller, Get, NotFoundException, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UpdateGuardianMeDto } from './dto/update-guardian-me.dto';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

@Controller('guardian')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class GuardianController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @Roles('GUARDIAN')
  async getMe(@Req() req: TenantRequest, @CurrentUser() user: CurrentUserPayload) {
    const tenantId = req.tenant?.id ?? user.tenantId;

    if (!tenantId) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found for tenant',
      });
    }

    const guardian = await this.prisma.guardian.findFirst({
      where: {
        tenantId,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found',
      });
    }

    return {
      id: guardian.id,
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.user.email,
    };
  }

  @Put('me')
  @Roles('GUARDIAN')
  async updateMe(
    @Req() req: TenantRequest,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateGuardianMeDto
  ) {
    const tenantId = req.tenant?.id ?? user.tenantId;

    if (!tenantId) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found for tenant',
      });
    }

    const existing = await this.prisma.guardian.findFirst({
      where: { tenantId, userId: user.id },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found',
      });
    }

    const data: { name?: string; phone?: string } = {};

    if (typeof dto.name === 'string') {
      data.name = dto.name.trim();
    }

    if (typeof dto.phone === 'string') {
      data.phone = dto.phone.trim();
    }

    const updated = await this.prisma.guardian.update({
      where: { id: existing.id },
      data,
    });

    return {
      id: updated.id,
      name: updated.name,
      phone: updated.phone,
    };
  }

  @Get('students')
  @Roles('GUARDIAN')
  async getStudents(@Req() req: TenantRequest, @CurrentUser() user: CurrentUserPayload) {
    const tenantId = req.tenant?.id ?? user.tenantId;

    if (!tenantId) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found for tenant',
      });
    }

    const guardian = await this.prisma.guardian.findFirst({
      where: {
        tenantId,
        userId: user.id,
      },
      include: {
        students: {
          include: {
            student: {
              include: {
                class: true,
              },
            },
          },
        },
      },
    });

    if (!guardian) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found',
      });
    }

    const items = guardian.students.map((link) => ({
      id: link.student.id,
      name: link.student.name,
      status: link.student.status,
      class: {
        id: link.student.class.id,
        name: link.student.class.name,
      },
    }));

    return { items };
  }
}

