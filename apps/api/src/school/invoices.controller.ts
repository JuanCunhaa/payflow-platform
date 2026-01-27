import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { CreateOneOffInvoiceDto } from './dto/create-one-off-invoice.dto';
import { MarkInvoicePaidDto } from './dto/mark-invoice-paid.dto';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../billing/payment.service';
import { EmailService } from '../notifications/email.service';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

const ALLOWED_STATUS: InvoiceStatus[] = [
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
  if (ALLOWED_STATUS.includes(upper as InvoiceStatus)) {
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

async function logInvoiceCommunicationOncePerDay(
  prisma: PrismaService,
  invoiceId: string,
  type: 'CREATED' | 'OVERDUE' | 'PAID',
  sentAt: Date
): Promise<void> {
  const start = new Date(sentAt);
  start.setHours(0, 0, 0, 0);
  const end = new Date(sentAt);
  end.setHours(23, 59, 59, 999);

  const existing = await prisma.invoiceCommunication.findFirst({
    where: {
      invoiceId,
      type,
      sentAt: {
        gte: start,
        lte: end,
      },
    },
  });

  if (existing) return;

  await prisma.invoiceCommunication.create({
    data: {
      invoiceId,
      type,
      sentAt,
    },
  });
}

@Controller('school/invoices')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class SchoolInvoicesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService
  ) { }

  @Get()
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY', 'READONLY')
  async listInvoices(
    @Req() req: TenantRequest,
    @Query('status') statusParam?: string,
    @Query('q') searchQuery?: string,
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
    @Query('studentId') studentId?: string,
    @Query('guardianId') guardianId?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const { page, pageSize } = parsePageParams(pageParam, limitParam);
    const status = parseInvoiceStatus(statusParam);
    const from = parseDate(fromParam);
    const to = parseDate(toParam);

    const where: Prisma.InvoiceWhereInput = {
      tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (guardianId) {
      where.guardianId = guardianId;
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

    const q = searchQuery?.trim();
    if (q) {
      const term = q;
      where.OR = [
        {
          student: {
            name: { contains: term, mode: 'insensitive' },
          },
        },
        {
          guardian: {
            name: { contains: term, mode: 'insensitive' },
          },
        },
        {
          guardian: {
            user: {
              email: { contains: term.toLowerCase(), mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [total, invoices] = await this.prisma.$transaction([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { dueDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          contract: {
            select: {
              id: true,
              name: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
            },
          },
          guardian: {
            select: {
              id: true,
              name: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = invoices.map((invoice) => ({
      ...invoice,
      receiptUrl: null as string | null,
    }));

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
  async getInvoice(@Req() req: TenantRequest, @Param('id') id: string) {
    const tenantId = req.tenant!.id;

    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        contract: {
          select: {
            id: true,
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
        guardian: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        items: true,
        communications: {
          select: {
            id: true,
            type: true,
            sentAt: true,
          },
          orderBy: {
            sentAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found for this tenant',
      });
    }

    return {
      invoice: {
        ...invoice,
        receiptUrl: null as string | null,
      },
    };
  }

  @Post('one-off')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async createOneOffInvoice(
    @Req() req: TenantRequest,
    @Body() dto: CreateOneOffInvoiceDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const amountCents = dto.amountCents;
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new BadRequestException({
        code: 'invalid_amount',
        message: 'Amount must be greater than zero',
      });
    }

    const dueDate = new Date(dto.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException({
        code: 'invalid_due_date',
        message: 'Invalid due date',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDue = new Date(dueDate);
    normalizedDue.setHours(0, 0, 0, 0);

    if (normalizedDue < today) {
      throw new BadRequestException({
        code: 'invalid_due_date',
        message: 'Due date cannot be in the past',
      });
    }

    const competenceYear = normalizedDue.getFullYear();
    const competenceMonth = normalizedDue.getMonth() + 1;

    const [tenant, student, guardian] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true },
      }),
      this.prisma.student.findFirst({
        where: { id: dto.studentId, tenantId },
        select: { id: true, name: true },
      }),
      this.prisma.guardian.findFirst({
        where: { id: dto.guardianId, tenantId },
        select: {
          id: true,
          name: true,
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
    ]);

    if (!student) {
      throw new BadRequestException({
        code: 'student_not_found',
        message: 'Student not found for this tenant',
      });
    }

    if (!guardian) {
      throw new BadRequestException({
        code: 'guardian_not_found',
        message: 'Guardian not found for this tenant',
      });
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        contractId: null,
        guardianId: guardian.id,
        studentId: student.id,
        amountCents,
        dueDate,
        status: 'PENDING',
        provider: 'SANDBOX',
        competenceYear,
        competenceMonth,
        items: {
          create: {
            description: dto.description,
            amountCents,
          },
        },
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'invoice.oneoff.create',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: {
        studentId: student.id,
        guardianId: guardian.id,
        amountCents,
        dueDate: dueDate.toISOString(),
      },
    });

    const guardianEmail = guardian.user?.email;
    const sentAt = new Date();
    if (guardianEmail) {
      await this.emailService.sendInvoiceCreated({
        recipient: guardianEmail,
        studentName: student.name,
        schoolName: tenant?.name ?? '',
        amountCents,
        dueDate: normalizedDue,
        paymentLink: invoice.paymentLink ?? undefined,
      });
      await logInvoiceCommunicationOncePerDay(this.prisma, invoice.id, 'CREATED', sentAt);
    }

    return {
      invoiceId: invoice.id,
    };
  }

  @Post(':id/mark-paid')
  @Roles('SCHOOL_ADMIN', 'FINANCE')
  async markInvoiceAsPaid(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @Body() dto: MarkInvoicePaidDto,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const invoice = (await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        tenant: {
          select: { name: true },
        },
        student: {
          select: { name: true },
        },
        guardian: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    }));

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found for this tenant',
      });
    }

    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'Only pending or overdue invoices can be marked as paid manually',
      });
    }

    const paidAt = new Date(dto.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      throw new BadRequestException({
        code: 'invalid_paid_at',
        message: 'Invalid paidAt date',
      });
    }

    const paidNote = dto.note?.trim() || null;
    const receiptUrl =
      dto.receiptUrl === undefined || dto.receiptUrl === null
        ? null
        : String(dto.receiptUrl).trim() || null;

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt,
        paidMethod: 'MANUAL',
        paidNote,
        receiptUrl,
      },
    });

    await this.auditService.log({
      tenantId,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'invoice.manual_paid',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: {
        paidAt: paidAt.toISOString(),
        paidMethod: 'MANUAL',
        paidNote,
        hasReceiptUrl: !!receiptUrl,
      },
    });

    const guardianEmail = invoice.guardian?.user?.email as string | undefined;
    if (guardianEmail) {
      await this.emailService.sendInvoicePaid({
        recipient: guardianEmail,
        studentName: invoice.student?.name ?? '',
        schoolName: invoice.tenant?.name ?? '',
        amountCents: invoice.amountCents,
        dueDate: invoice.dueDate,
        paidAt,
      });
      await logInvoiceCommunicationOncePerDay(this.prisma, invoice.id, 'PAID', paidAt);
    }

    return {
      success: true,
      status: 'PAID',
    };
  }

  @Post(':id/payment-link')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY')
  async createPaymentLink(
    @Req() req: TenantRequest,
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload
  ) {
    const tenantId = req.tenant!.id;

    const invoice = (await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        status: true,
        paymentLink: true,
        provider: true,
      },
    }));

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found for this tenant',
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
