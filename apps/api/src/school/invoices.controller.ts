import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
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

@Controller('school/invoices')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class SchoolInvoicesController {
  constructor(private readonly prisma: PrismaService) {}

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

    const where: any = {
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
}

