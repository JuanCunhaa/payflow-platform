import {
  BadRequestException,
  Body,
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
import { Contract } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { UpdateContractStudentsDto } from './dto/update-contract-students.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type ContractStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED';

const CONTRACT_STATUSES: ContractStatus[] = ['ACTIVE', 'PAUSED', 'CANCELED'];

function parseContractStatus(value?: string): ContractStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (CONTRACT_STATUSES.includes(upper as ContractStatus)) {
    return upper as ContractStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid contract status',
  });
}

function parsePageParams(pageParam?: string, limitParam?: string) {
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const limitRaw = parseInt(limitParam ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(limitRaw, 1), 100);
  return { page, pageSize };
}

@Controller('school/contracts')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class ContractsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) { }

  @Get()
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY', 'READONLY')
  async listContracts(
    @Req() req: TenantRequest,
    @Query('q') searchQuery?: string,
    @Query('status') statusParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, limitParam);
    const status = parseContractStatus(statusParam);

    const where: {
      tenantId: string;
      status?: ContractStatus;
      name?: { contains: string; mode: 'insensitive' };
    } = { tenantId };

    const q = searchQuery?.trim();
    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.contract.count({ where }),
      this.prisma.contract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
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

  @Get(':id')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY', 'READONLY')
  async getContract(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      include: {
        contractStudents: {
          include: {
            student: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException({
        code: 'contract_not_found',
        message: 'Contract not found for this tenant',
      });
    }

    const students = contract.contractStudents.map((cs) => cs.student);
    const { contractStudents: _contractStudents, ...rest } = contract;

    return {
      contract: rest,
      students,
    };
  }

  @Post()
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async createContract(
    @Req() req: TenantRequest,
    @Body() dto: CreateContractDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    const amountCents = dto.amountCents;
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException({
        code: 'invalid_amount',
        message: 'Amount must be greater than zero',
      });
    }

    const dueDay = dto.dueDay;
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) {
      throw new BadRequestException({
        code: 'invalid_due_day',
        message: 'Due day must be between 1 and 28',
      });
    }

    const startDate = new Date(dto.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException({
        code: 'invalid_start_date',
        message: 'Invalid start date',
      });
    }

    let endDate: Date | null = null;
    if (dto.endDate) {
      const parsed = new Date(dto.endDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException({
          code: 'invalid_end_date',
          message: 'Invalid end date',
        });
      }
      endDate = parsed;
    }

    const status: ContractStatus = (dto.status as ContractStatus | undefined) ?? 'ACTIVE';
    const currency = dto.currency?.trim() || 'BRL';

    const contract = await this.prisma.contract.create({
      data: {
        tenantId,
        name,
        amountCents,
        currency,
        dueDay,
        startDate,
        endDate,
        status,
        createdByUserId: user.id,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'contract.create',
      targetType: 'contract',
      targetId: contract.id,
      metadata: {
        name: contract.name,
        amountCents: contract.amountCents,
        currency: contract.currency,
        dueDay: contract.dueDay,
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate ? contract.endDate.toISOString() : null,
        status: contract.status,
      },
    });

    return { contract };
  }

  @Put(':id')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async updateContract(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const existing = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'contract_not_found',
        message: 'Contract not found for this tenant',
      });
    }

    const data: {
      name?: string;
      amountCents?: number;
      currency?: string;
      dueDay?: number;
      startDate?: Date;
      endDate?: Date | null;
      status?: ContractStatus;
    } = {};

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

    if (dto.amountCents !== undefined) {
      if (!Number.isInteger(dto.amountCents) || dto.amountCents <= 0) {
        throw new BadRequestException({
          code: 'invalid_amount',
          message: 'Amount must be greater than zero',
        });
      }
      data.amountCents = dto.amountCents;
    }

    if (dto.currency !== undefined) {
      const currency = dto.currency.trim();
      data.currency = currency || 'BRL';
    }

    if (dto.dueDay !== undefined) {
      if (!Number.isInteger(dto.dueDay) || dto.dueDay < 1 || dto.dueDay > 28) {
        throw new BadRequestException({
          code: 'invalid_due_day',
          message: 'Due day must be between 1 and 28',
        });
      }
      data.dueDay = dto.dueDay;
    }

    if (dto.startDate !== undefined) {
      const parsed = new Date(dto.startDate);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException({
          code: 'invalid_start_date',
          message: 'Invalid start date',
        });
      }
      data.startDate = parsed;
    }

    if (dto.endDate !== undefined) {
      if (dto.endDate === null) {
        data.endDate = null;
      } else {
        const parsed = new Date(dto.endDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException({
            code: 'invalid_end_date',
            message: 'Invalid end date',
          });
        }
        data.endDate = parsed;
      }
    }

    if (dto.status !== undefined) {
      const status = parseContractStatus(dto.status);
      if (!status) {
        throw new BadRequestException({
          code: 'invalid_status',
          message: 'Invalid contract status',
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

    const updated = await this.prisma.contract.update({
      where: { id },
      data,
    });

    const changes: Record<string, { before: unknown; after: unknown }> = {};
    const fields: Array<keyof typeof data> = [
      'name',
      'amountCents',
      'currency',
      'dueDay',
      'startDate',
      'endDate',
      'status',
    ];
    for (const field of fields) {
      if (field in data) {
        const key = field as keyof Contract;
        const beforeValue = existing[key];
        const afterValue = updated[key];
        if (beforeValue instanceof Date && afterValue instanceof Date) {
          if (beforeValue.getTime() !== afterValue.getTime()) {
            changes[field] = {
              before: beforeValue.toISOString(),
              after: afterValue.toISOString(),
            };
          }
        } else if (beforeValue !== afterValue) {
          changes[field] = {
            before: beforeValue,
            after: afterValue,
          };
        }
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditService.log({
        tenantId,
        actorUserId: user.id,
        actorType: 'USER',
        action: 'contract.update',
        targetType: 'contract',
        targetId: updated.id,
        metadata: {
          changes,
        },
      });
    }

    return { contract: updated };
  }

  @Post(':id/pause')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async pauseContract(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.updateStatus(req, id, 'PAUSED', 'contract.pause', user);
  }

  @Post(':id/resume')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async resumeContract(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.updateStatus(req, id, 'ACTIVE', 'contract.resume', user);
  }

  @Post(':id/cancel')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async cancelContract(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    return this.updateStatus(req, id, 'CANCELED', 'contract.cancel', user);
  }

  @Post(':id/students')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async addStudents(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: UpdateContractStudentsDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      select: { id: true, tenantId: true },
    });

    if (!contract) {
      throw new NotFoundException({
        code: 'contract_not_found',
        message: 'Contract not found for this tenant',
      });
    }

    const requestedIds = Array.from(new Set(dto.studentIds));

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: requestedIds },
        tenantId,
      },
      select: { id: true },
    });

    if (students.length !== requestedIds.length) {
      throw new BadRequestException({
        code: 'invalid_student',
        message: 'One or more students do not exist for this tenant',
      });
    }

    await this.prisma.contractStudent.createMany({
      data: students.map((student) => ({
        contractId: contract.id,
        studentId: student.id,
      })),
      skipDuplicates: true,
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'contract.update',
      targetType: 'contract',
      targetId: contract.id,
      metadata: {
        studentsAdded: requestedIds,
      },
    });

    return { success: true };
  }

  @Delete(':id/students/:studentId')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async removeStudent(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });

    if (!contract) {
      throw new NotFoundException({
        code: 'contract_not_found',
        message: 'Contract not found for this tenant',
      });
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId },
      select: { id: true },
    });

    if (!student) {
      throw new BadRequestException({
        code: 'invalid_student',
        message: 'Student does not exist for this tenant',
      });
    }

    await this.prisma.contractStudent.deleteMany({
      where: {
        contractId: contract.id,
        studentId: student.id,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'contract.update',
      targetType: 'contract',
      targetId: contract.id,
      metadata: {
        studentRemoved: student.id,
      },
    });

    return { success: true };
  }

  private async updateStatus(
    req: TenantRequest,
    id: string,
    nextStatus: ContractStatus,
    action: 'contract.pause' | 'contract.resume' | 'contract.cancel',
    user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const contract = await this.prisma.contract.findFirst({
      where: { id, tenantId },
    });

    if (!contract) {
      throw new NotFoundException({
        code: 'contract_not_found',
        message: 'Contract not found for this tenant',
      });
    }

    const currentStatus = contract.status as ContractStatus;

    if (nextStatus === currentStatus) {
      // Idempotent operation
      return { contract };
    }

    if (action === 'contract.pause' && currentStatus !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'invalid_status_transition',
        message: 'Only ACTIVE contracts can be paused',
      });
    }

    if (action === 'contract.resume' && currentStatus !== 'PAUSED') {
      throw new BadRequestException({
        code: 'invalid_status_transition',
        message: 'Only PAUSED contracts can be resumed',
      });
    }

    if (action === 'contract.cancel' && currentStatus === 'CANCELED') {
      throw new BadRequestException({
        code: 'invalid_status_transition',
        message: 'Contract is already canceled',
      });
    }

    const updated = await this.prisma.contract.update({
      where: { id },
      data: {
        status: nextStatus,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action,
      targetType: 'contract',
      targetId: updated.id,
      metadata: {
        previousStatus: currentStatus,
        newStatus: nextStatus,
      },
    });

    return { contract: updated };
  }
}
