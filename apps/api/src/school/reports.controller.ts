import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';

type TenantRequest = Partial<Request> & {
  tenant?: { id: string; slug: string };
};

type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELED'
  | 'REFUNDED';

const ALLOWED_STATUS: InvoiceStatus[] = [
  'DRAFT',
  'PENDING',
  'PAID',
  'OVERDUE',
  'CANCELED',
  'REFUNDED',
];

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

function escapeCsvValue(input: string): string {
  let value = input;
  if (value.includes('"')) {
    value = value.replace(/"/g, '""');
  }
  if (/[",\r\n]/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

function formatAmount(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

@Controller('school/reports')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class SchoolReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('summary')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY', 'READONLY')
  async getSummary(
    @Req() req: TenantRequest,
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string
  ) {
    const tenantId = req.tenant!.id;
    const from = parseDate(fromParam);
    const to = parseDate(toParam);

    const dueDateFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      dueDateFilter.gte = from;
    }
    if (to) {
      dueDateFilter.lte = to;
    }

    const baseWhere: Record<string, unknown> = {
      tenantId,
    };

    if (from || to) {
      baseWhere.dueDate = dueDateFilter;
    }

    const [paidSum, openSum, overdueSum, openCount, overdueCount] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            status: 'PAID',
          } as any,
          _sum: { amountCents: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            status: { in: ['PENDING', 'OVERDUE'] },
          } as any,
          _sum: { amountCents: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            ...baseWhere,
            status: 'OVERDUE',
          } as any,
          _sum: { amountCents: true },
        }),
        this.prisma.invoice.count({
          where: {
            ...baseWhere,
            status: { in: ['PENDING', 'OVERDUE'] },
          } as any,
        }),
        this.prisma.invoice.count({
          where: {
            ...baseWhere,
            status: 'OVERDUE',
          } as any,
        }),
      ]);

    return {
      totalBilledCents: paidSum._sum.amountCents ?? 0,
      totalOpenCents: openSum._sum.amountCents ?? 0,
      totalOverdueCents: overdueSum._sum.amountCents ?? 0,
      openInvoicesCount: openCount,
      overdueInvoicesCount: overdueCount,
    };
  }

  @Get('overdue')
  @Roles('SCHOOL_ADMIN', 'FINANCE', 'SECRETARY', 'READONLY')
  async getOverdue(@Req() req: TenantRequest) {
    const tenantId = req.tenant!.id;

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'OVERDUE',
      } as any,
      orderBy: {
        dueDate: 'asc',
      },
      include: {
        student: {
          select: { name: true },
        },
        guardian: {
          select: {
            name: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (invoices as any[]).map((invoice) => {
      const dueDate =
        invoice.dueDate instanceof Date
          ? (invoice.dueDate as Date)
          : new Date(invoice.dueDate);
      const due = new Date(dueDate);
      due.setHours(0, 0, 0, 0);

      const diffMs = today.getTime() - due.getTime();
      const daysOverdue =
        Number.isFinite(diffMs) && diffMs > 0
          ? Math.floor(diffMs / (1000 * 60 * 60 * 24))
          : 0;

      return {
        invoiceId: invoice.id as string,
        student: (invoice.student?.name as string | null) ?? null,
        guardian:
          (invoice.guardian?.name as string | null) ??
          (invoice.guardian?.user?.email as string | null) ??
          null,
        amountCents: invoice.amountCents as number,
        dueDate: dueDate.toISOString(),
        status: invoice.status as InvoiceStatus,
        daysOverdue,
      };
    });
  }

  @Get('invoices/export')
  @Roles('SCHOOL_ADMIN', 'FINANCE')
  async exportInvoicesCsv(
    @Req() req: TenantRequest,
    @Query('from') fromParam: string | undefined,
    @Query('to') toParam: string | undefined,
    @Query('status') statusParam: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const tenantId = req.tenant!.id;
    const from = parseDate(fromParam);
    const to = parseDate(toParam);
    const status = parseInvoiceStatus(statusParam);

    const where: Record<string, unknown> = {
      tenantId,
    };

    if (from || to) {
      const dueDateFilter: { gte?: Date; lte?: Date } = {};
      if (from) {
        dueDateFilter.gte = from;
      }
      if (to) {
        dueDateFilter.lte = to;
      }
      where.dueDate = dueDateFilter;
    }

    if (status) {
      where.status = status;
    }

    const invoices = await this.prisma.invoice.findMany({
      where: where as any,
      orderBy: { dueDate: 'asc' },
      include: {
        student: {
          select: { name: true },
        },
        guardian: {
          select: {
            name: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="invoices-export.csv"',
    );

    res.write(
      'aluno,responsavel,valor,vencimento,status,pago_em,metodo_pagamento\n',
    );

    for (const invoice of invoices as any[]) {
      const aluno = escapeCsvValue(invoice.student?.name ?? '');
      const responsavel = escapeCsvValue(
        invoice.guardian?.name ?? invoice.guardian?.user?.email ?? '',
      );
      const valor = formatAmount(invoice.amountCents);
      const vencimento =
        invoice.dueDate instanceof Date
          ? (invoice.dueDate as Date).toISOString()
          : String(invoice.dueDate);
      const statusValue = invoice.status ?? '';
      const pagoEm =
        invoice.paidAt instanceof Date
          ? (invoice.paidAt as Date).toISOString()
          : invoice.paidAt
          ? String(invoice.paidAt)
          : '';
      const metodoPagamento = invoice.paidMethod ?? '';

      const line = [
        aluno,
        responsavel,
        valor,
        vencimento,
        statusValue,
        pagoEm,
        metodoPagamento,
      ]
        .map((value) => escapeCsvValue(value))
        .join(',');

      res.write(`${line}\n`);
    }

    res.end();
  }
}
