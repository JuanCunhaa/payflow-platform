import {
  BadRequestException,
  Controller,
  Get,
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
}

