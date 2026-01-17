import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
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
import { UpdateGuardianMeDto } from './dto/update-guardian-me.dto';
import { PaymentService } from '../billing/payment.service';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

const ALLOWED_INVOICE_STATUS: InvoiceStatus[] = [
  'DRAFT',
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELED',
  'REFUNDED',
];

function parseInvoiceStatus(value?: string): InvoiceStatus | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (ALLOWED_INVOICE_STATUS.includes(upper as InvoiceStatus)) {
    return upper as InvoiceStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid invoice status',
  });
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      code: 'invalid_date',
      message: 'Invalid date format',
    });
  }
  return date;
}

function parsePageParams(pageParam?: string, limitParam?: string) {
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const limitRaw = parseInt(limitParam ?? '20', 10) || 20;
  const pageSize = Math.min(Math.max(limitRaw, 1), 100);
  return { page, pageSize };
}

@Controller('guardian')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class GuardianController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService
  ) {}

  private async resolveGuardianContext(
    req: TenantRequest,
    user: CurrentUserPayload
  ): Promise<{ guardian: any; tenantId: string; studentIds: string[] }> {
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
          select: {
            studentId: true,
          },
        },
        user: {
          select: {
            status: true,
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

    if (guardian.user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        code: 'guardian_inactive',
        message: 'Guardian is not active',
      });
    }

    const studentIds = guardian.students.map(
      (link: { studentId: string }) => link.studentId
    );

    return { guardian, tenantId, studentIds };
  }

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
    const { guardian } = await this.resolveGuardianContext(req, user);

    const guardianWithStudents = await this.prisma.guardian.findFirst({
      where: { id: guardian.id },
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

    if (!guardianWithStudents) {
      throw new NotFoundException({
        code: 'guardian_profile_not_found',
        message: 'Guardian profile not found',
      });
    }

    const items = guardianWithStudents.students.map((link) => ({
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

  @Get('invoices')
  @Roles('GUARDIAN')
  async listInvoices(
    @Req() req: TenantRequest,
    @CurrentUser() user: CurrentUserPayload,
    @Query('status') statusParam?: string,
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
    @Query('studentId') studentId?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const { guardian, tenantId, studentIds } = await this.resolveGuardianContext(req, user);

    const status = parseInvoiceStatus(statusParam);
    const from = parseDate(fromParam);
    const to = parseDate(toParam);
    const { page, pageSize } = parsePageParams(pageParam, limitParam);

    const where: any = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.dueDate = {};
      if (from) {
        where.dueDate.gte = from;
      }
      if (to) {
        where.dueDate.lte = to;
      }
    }

    if (studentId) {
      where.studentId = studentId;
    }

    const orConditions: any[] = [{ guardianId: guardian.id }];
    if (studentIds.length > 0) {
      orConditions.push({ studentId: { in: studentIds } });
    }

    where.AND = [{ OR: orConditions }];

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          student: {
            select: {
              id: true,
              name: true,
            },
          },
          contract: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const items = invoices.map((invoice) => ({
      id: invoice.id,
      dueDate: invoice.dueDate,
      amountCents: invoice.amountCents,
      status: invoice.status as InvoiceStatus,
      student: invoice.student
        ? { id: invoice.student.id, name: invoice.student.name }
        : null,
      contract: invoice.contract
        ? { id: invoice.contract.id, name: invoice.contract.name }
        : null,
      description: invoice.contract?.name ?? null,
      paymentLink: null as string | null,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  @Get('invoices/:id')
  @Roles('GUARDIAN')
  async getInvoice(
    @Req() req: TenantRequest,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string
  ) {
    const { guardian, tenantId, studentIds } = await this.resolveGuardianContext(req, user);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        contract: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found',
      });
    }

    const ownsInvoice =
      invoice.guardianId === guardian.id ||
      (invoice.studentId && studentIds.includes(invoice.studentId));

    if (!ownsInvoice) {
      throw new ForbiddenException({
        code: 'forbidden_invoice',
        message: 'You are not allowed to access this invoice',
      });
    }

    return {
      invoice: {
        id: invoice.id,
        dueDate: invoice.dueDate,
        amountCents: invoice.amountCents,
        status: invoice.status as InvoiceStatus,
        student: invoice.student
          ? { id: invoice.student.id, name: invoice.student.name }
          : null,
        contract: invoice.contract
          ? { id: invoice.contract.id, name: invoice.contract.name }
          : null,
        description: invoice.contract?.name ?? null,
        paymentLink: null as string | null,
      },
    };
  }

  @Post('invoices/:id/payment-link')
  @Roles('GUARDIAN')
  async createPaymentLink(
    @Req() req: TenantRequest,
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string
  ) {
    const { guardian, tenantId, studentIds } = await this.resolveGuardianContext(req, user);

    const invoice = (await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        guardianId: true,
        studentId: true,
        status: true,
        paymentLink: true,
        provider: true,
      } as any,
    })) as any;

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found',
      });
    }

    const ownsInvoice =
      invoice.guardianId === guardian.id ||
      (invoice.studentId && studentIds.includes(invoice.studentId));

    if (!ownsInvoice) {
      throw new ForbiddenException({
        code: 'forbidden_invoice',
        message: 'You are not allowed to access this invoice',
      });
    }

    if (invoice.paymentLink) {
      return {
        paymentLink: invoice.paymentLink as string,
        provider: (invoice.provider as string) ?? 'SANDBOX',
      };
    }

    const result = await this.paymentService.createPaymentLinkForInvoice(id, user.id);

    return {
      paymentLink: result.paymentLink,
      provider: result.provider,
    };
  }
}
