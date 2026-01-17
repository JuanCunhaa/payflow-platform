import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type ContractStatus = 'ACTIVE' | 'PAUSED' | 'CANCELED';

type ContractForJob = {
  id: string;
  tenantId: string;
  amountCents: number;
  dueDay: number;
  status: ContractStatus;
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

@Injectable()
export class InvoiceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceJobsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  onModuleInit() {
    if (process.env.DISABLE_INVOICE_SCHEDULER === '1') {
      this.logger.log('Invoice scheduler disabled by DISABLE_INVOICE_SCHEDULER=1');
      return;
    }

    const dayMs = 24 * 60 * 60 * 1000;

    this.timer = setInterval(() => {
      void this.runDailyJobSafe();
    }, dayMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runDailyJobSafe(): Promise<void> {
    try {
      const now = new Date();
      await this.generateMonthlyInvoices(now);
      await this.recalculateOverdueInvoices(now);
    } catch (error) {
      this.logger.error('Failed to run invoice generation job', error as Error);
    }
  }

  async generateMonthlyInvoices(referenceDate: Date = new Date()) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth() + 1;

    const contracts = await this.prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        tenantId: true,
        amountCents: true,
        dueDay: true,
        status: true,
      },
    });

    let createdCount = 0;

    const daysInMonth = getDaysInMonth(year, month);

    for (const contract of contracts as ContractForJob[]) {
      const dueDay = Math.min(Math.max(contract.dueDay, 1), daysInMonth);
      const dueDate = new Date(Date.UTC(year, month - 1, dueDay, 3, 0, 0));

      const existing = await this.prisma.invoice.findFirst({
        where: {
          tenantId: contract.tenantId,
          contractId: contract.id,
          competenceYear: year,
          competenceMonth: month,
        },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      try {
        await this.prisma.invoice.create({
          data: {
            tenantId: contract.tenantId,
            contractId: contract.id,
            amountCents: contract.amountCents,
            dueDate,
            competenceYear: year,
            competenceMonth: month,
            status: 'PENDING',
            provider: 'SANDBOX',
          },
        });
        createdCount += 1;
      } catch (error) {
        this.logger.error(
          `Failed to create invoice for contract ${contract.id} (${year}-${month})`,
          error as Error
        );
      }
    }

    await this.auditService.log({
      tenantId: null,
      actorUserId: null,
      actorType: 'SYSTEM',
      action: 'job.invoices.generate',
      targetType: 'job',
      targetId: null,
      metadata: {
        year,
        month,
        totalContracts: contracts.length,
        createdInvoices: createdCount,
      },
      ip: null,
      userAgent: null,
    });

    return {
      year,
      month,
      totalContracts: contracts.length,
      createdInvoices: createdCount,
    };
  }

  async recalculateOverdueInvoices(referenceDate: Date = new Date()) {
    const now = referenceDate;

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: 'OVERDUE',
      },
    });

    const affected = result.count ?? 0;

    await this.auditService.log({
      tenantId: null,
      actorUserId: null,
      actorType: 'SYSTEM',
      action: 'job.invoices.mark_overdue',
      targetType: 'job',
      targetId: null,
      metadata: {
        asOf: now.toISOString(),
        affected,
      },
      ip: null,
      userAgent: null,
    });

    return {
      asOf: now.toISOString(),
      affected,
    };
  }
}
