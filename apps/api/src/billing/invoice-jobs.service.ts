/* eslint-disable no-undef */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';

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

@Injectable()
export class InvoiceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceJobsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService
  ) { }

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
      await this.sendOverdueReminders(now);
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
        const invoice = await this.prisma.invoice.create({
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

        await this.sendInvoiceCreatedEmailsForContractInvoice(
          contract.id,
          invoice.id,
          contract.tenantId,
          contract.amountCents,
          dueDate,
          invoice.paymentLink ?? undefined
        );
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

  private async sendInvoiceCreatedEmailsForContractInvoice(
    contractId: string,
    invoiceId: string,
    tenantId: string,
    amountCents: number,
    dueDate: Date,
    paymentLink?: string
  ): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    const contractStudents = await this.prisma.contractStudent.findMany({
      where: { contractId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            guardians: {
              include: {
                guardian: {
                  include: {
                    user: {
                      select: { email: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const cs of contractStudents) {
      const student = cs.student;
      if (!student) continue;

      for (const gs of student.guardians) {
        const guardian = gs.guardian;
        const email = guardian?.user?.email;
        if (!email) continue;

        const sentAt = new Date();
        await this.emailService.sendInvoiceCreated({
          recipient: email,
          studentName: student.name,
          schoolName: tenant?.name ?? '',
          amountCents,
          dueDate,
          paymentLink,
        });
        await logInvoiceCommunicationOncePerDay(this.prisma, invoiceId, 'CREATED', sentAt);
      }
    }
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

  async sendOverdueReminders(referenceDate: Date = new Date()) {
    const REMINDER_INTERVAL_DAYS = 3;
    const asOf = new Date(referenceDate.getTime());
    const cutoff = new Date(
      asOf.getFullYear(),
      asOf.getMonth(),
      asOf.getDate() - REMINDER_INTERVAL_DAYS
    );

    const invoices = await this.prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: {
          lt: asOf,
        },
        OR: [
          { lastReminderSentAt: null },
          {
            lastReminderSentAt: {
              lt: cutoff,
            },
          },
        ],
        guardian: {
          user: {
            email: {
              not: null as any,
            },
          },
        },
      },
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
    });

    let sentReminders = 0;

    for (const invoice of invoices as any[]) {
      const email = invoice.guardian?.user?.email;
      if (!email) continue;

      const sentAt = new Date(asOf.getTime());
      await this.emailService.sendInvoiceOverdue({
        recipient: email,
        studentName: invoice.student?.name ?? '',
        schoolName: invoice.tenant?.name ?? '',
        amountCents: invoice.amountCents,
        dueDate: invoice.dueDate,
        paymentLink: invoice.paymentLink ?? undefined,
      });

      await logInvoiceCommunicationOncePerDay(this.prisma, invoice.id, 'OVERDUE', sentAt);

      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          lastReminderSentAt: asOf,
        },
      });

      sentReminders += 1;
    }

    await this.auditService.log({
      tenantId: null,
      actorUserId: null,
      actorType: 'SYSTEM',
      action: 'job.invoices.overdue_reminder',
      targetType: 'job',
      targetId: null,
      metadata: {
        asOf: asOf.toISOString(),
        sentReminders,
      },
      ip: null,
      userAgent: null,
    });

    return {
      asOf: asOf.toISOString(),
      sentReminders,
    };
  }
}
