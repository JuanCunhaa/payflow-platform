import { BadRequestException } from '@nestjs/common';
import { SchoolReportsController } from './reports.controller';
import { PrismaService } from '../prisma/prisma.service';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type InvoiceEntity = {
  id: string;
  tenantId: string;
  studentId?: string;
  guardianId?: string;
  amountCents: number;
  dueDate: Date;
  status: InvoiceStatus;
  studentName?: string;
  guardianName?: string;
  paidAt?: Date | null;
  paidMethod?: string | null;
};

type TenantRequest = {
  tenant?: { id: string; slug: string };
};

function createTenantRequest(tenantId: string): TenantRequest {
  return {
    tenant: { id: tenantId, slug: 'tenant-slug' },
  };
}

function filterInvoices(invoices: InvoiceEntity[], where: any): InvoiceEntity[] {
  return invoices.filter((invoice) => {
    if (where.tenantId && invoice.tenantId !== where.tenantId) {
      return false;
    }

    if (where.studentId && invoice.studentId !== where.studentId) {
      return false;
    }

    if (where.guardianId && invoice.guardianId !== where.guardianId) {
      return false;
    }

    if (where.status) {
      if (typeof where.status === 'string') {
        if (invoice.status !== where.status) return false;
      } else if (Array.isArray(where.status.in)) {
        if (!where.status.in.includes(invoice.status)) return false;
      }
    }

    if (where.dueDate) {
      const { gte, lte } = where.dueDate as { gte?: Date; lte?: Date };
      if (gte && invoice.dueDate < gte) return false;
      if (lte && invoice.dueDate > lte) return false;
    }

    return true;
  });
}

async function run() {
  const invoices: InvoiceEntity[] = [];

  const tenantId = 'tenant-1';
  const otherTenantId = 'tenant-2';

  const mkDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

  invoices.push(
    // Tenant 1 invoices
    {
      id: 'inv-1',
      tenantId,
      studentId: 'student-1',
      guardianId: 'guardian-1',
      amountCents: 10000,
      dueDate: mkDate('2026-01-10'),
      status: 'PAID',
      studentName: 'Aluno Pago',
      guardianName: 'Responsável Pago',
      paidAt: mkDate('2026-01-11'),
      paidMethod: 'SANDBOX',
    },
    {
      id: 'inv-2',
      tenantId,
      studentId: 'student-1',
      guardianId: 'guardian-1',
      amountCents: 20000,
      dueDate: mkDate('2026-01-15'),
      status: 'PENDING',
    },
    {
      id: 'inv-3',
      tenantId,
      studentId: 'student-2',
      guardianId: 'guardian-2',
      amountCents: 30000,
      dueDate: mkDate('2025-12-20'),
      status: 'OVERDUE',
      studentName: 'Aluno Atrasado',
      guardianName: 'Responsável Atrasado',
    },
    // Other tenant invoice (should be ignored)
    {
      id: 'inv-4',
      tenantId: otherTenantId,
      studentId: 'student-3',
      guardianId: 'guardian-3',
      amountCents: 50000,
      dueDate: mkDate('2026-01-12'),
      status: 'PAID',
    }
  );

  const prismaMock = {
    student: {
      findFirst: async (args: { where: { id?: string; tenantId?: string } }) => {
        if (args.where.id === 'student-1' && args.where.tenantId === tenantId) {
          return { id: 'student-1', name: 'Aluno Focado' };
        }
        return null;
      },
    },
    guardian: {
      findFirst: async (args: { where: { id?: string; tenantId?: string } }) => {
        if (args.where.id === 'guardian-1' && args.where.tenantId === tenantId) {
          return {
            id: 'guardian-1',
            name: 'Responsável Focado',
            user: { email: 'guardian1@example.com' },
          };
        }
        return null;
      },
    },
    invoice: {
      aggregate: async (args: { where: any; _sum: { amountCents?: true } }) => {
        const filtered = filterInvoices(invoices, args.where ?? {});
        const sum = args._sum.amountCents
          ? filtered.reduce((acc, invoice) => acc + invoice.amountCents, 0)
          : 0;
        return {
          _sum: {
            amountCents: sum,
          },
        };
      },
      count: async (args: { where: any }) => {
        const filtered = filterInvoices(invoices, args.where ?? {});
        return filtered.length;
      },
      findMany: async (args: { where?: any }) => {
        const filtered = filterInvoices(invoices, args.where ?? {});
        return filtered.map((invoice) => ({
          id: invoice.id,
          tenantId: invoice.tenantId,
          amountCents: invoice.amountCents,
          dueDate: invoice.dueDate,
          status: invoice.status,
          paidAt: invoice.paidAt ?? null,
          paidMethod: invoice.paidMethod ?? null,
          student: invoice.studentName ? { name: invoice.studentName } : null,
          guardian: invoice.guardianName
            ? {
                name: invoice.guardianName,
                user: { email: 'guardian@example.com' },
              }
            : null,
        }));
      },
    },
  } as unknown as PrismaService;

  const controller = new SchoolReportsController(prismaMock);

  const reqTenant = createTenantRequest(tenantId) as TenantRequest;

  // Summary without date filters
  const summaryAll = await controller.getSummary(reqTenant, undefined, undefined);

  if (summaryAll.totalBilledCents !== 10000) {
    throw new Error(`Expected totalBilledCents=10000, got ${summaryAll.totalBilledCents}`);
  }

  if (summaryAll.totalOpenCents !== 50000) {
    throw new Error(`Expected totalOpenCents=50000, got ${summaryAll.totalOpenCents}`);
  }

  if (summaryAll.totalOverdueCents !== 30000) {
    throw new Error(`Expected totalOverdueCents=30000, got ${summaryAll.totalOverdueCents}`);
  }

  if (summaryAll.openInvoicesCount !== 2) {
    throw new Error(`Expected openInvoicesCount=2, got ${summaryAll.openInvoicesCount}`);
  }

  if (summaryAll.overdueInvoicesCount !== 1) {
    throw new Error(`Expected overdueInvoicesCount=1, got ${summaryAll.overdueInvoicesCount}`);
  }

  // Summary with date range (2026-01-01 to 2026-01-31) should ignore overdue from 2025-12-20
  const summaryRange = await controller.getSummary(reqTenant, '2026-01-01', '2026-01-31');

  if (summaryRange.totalBilledCents !== 10000) {
    throw new Error(`Expected range totalBilledCents=10000, got ${summaryRange.totalBilledCents}`);
  }

  if (summaryRange.totalOpenCents !== 20000) {
    throw new Error(`Expected range totalOpenCents=20000, got ${summaryRange.totalOpenCents}`);
  }

  if (summaryRange.totalOverdueCents !== 0) {
    throw new Error(`Expected range totalOverdueCents=0, got ${summaryRange.totalOverdueCents}`);
  }

  if (summaryRange.openInvoicesCount !== 1) {
    throw new Error(`Expected range openInvoicesCount=1, got ${summaryRange.openInvoicesCount}`);
  }

  if (summaryRange.overdueInvoicesCount !== 0) {
    throw new Error(
      `Expected range overdueInvoicesCount=0, got ${summaryRange.overdueInvoicesCount}`
    );
  }

  // Invalid date should throw BadRequestException
  let invalidDateError = false;
  try {
    await controller.getSummary(reqTenant, 'not-a-date', undefined);
  } catch (error) {
    invalidDateError = error instanceof BadRequestException;
  }
  if (!invalidDateError) {
    throw new Error('Expected BadRequestException for invalid date filter');
  }

  // Overdue report should list only overdue invoices for the tenant
  const overdue = await controller.getOverdue(reqTenant);

  if (overdue.length !== 1) {
    throw new Error(`Expected 1 overdue invoice, got ${overdue.length}`);
  }

  const firstOverdue = overdue[0];
  if (firstOverdue.invoiceId !== 'inv-3') {
    throw new Error(`Expected overdue invoice inv-3, got ${firstOverdue.invoiceId}`);
  }

  if (firstOverdue.student !== 'Aluno Atrasado') {
    throw new Error(`Expected student name Aluno Atrasado, got ${firstOverdue.student}`);
  }

  if (typeof firstOverdue.daysOverdue !== 'number' || firstOverdue.daysOverdue <= 0) {
    throw new Error(`Expected daysOverdue to be > 0, got ${firstOverdue.daysOverdue}`);
  }

  // CSV export with filters (2026-01, PAID)
  const chunks: string[] = [];
  const headers: Record<string, string> = {};

  const resMock = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
    },
    write: (chunk: string) => {
      chunks.push(String(chunk));
    },
    end: () => {},
  } as any;

  await controller.exportInvoicesCsv(reqTenant, '2026-01-01', '2026-01-31', 'PAID', resMock);

  if (headers['Content-Type'] !== 'text/csv; charset=utf-8') {
    throw new Error(
      `Expected Content-Type to be text/csv; charset=utf-8, got ${headers['Content-Type']}`
    );
  }

  if (!headers['Content-Disposition']?.includes('invoices-export')) {
    throw new Error('Expected Content-Disposition header with invoices-export');
  }

  const csv = chunks.join('');
  const lines = csv.trim().split('\n');

  if (lines.length !== 2) {
    throw new Error(`Expected 2 CSV lines (header + 1 row), got ${lines.length}`);
  }

  const header = lines[0];
  if (header !== 'aluno,responsavel,valor,vencimento,status,pago_em,metodo_pagamento') {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const row = lines[1];
  if (!row.includes('Aluno Pago') || !row.includes('Responsável Pago')) {
    throw new Error('CSV row must contain student and guardian names');
  }

  if (!row.includes('100.00') || !row.includes('PAID')) {
    throw new Error('CSV row must contain amount 100.00 and status PAID');
  }

  // Student report: only invoices for student-1 (inv-1 paid, inv-2 pending)
  const studentReport = await controller.getStudentReport(reqTenant, 'student-1');

  if (studentReport.student.id !== 'student-1') {
    throw new Error(`Expected student id student-1, got ${studentReport.student.id}`);
  }

  if (studentReport.totals.totalPaidCents !== 10000) {
    throw new Error(`Expected totalPaidCents=10000, got ${studentReport.totals.totalPaidCents}`);
  }

  if (studentReport.totals.totalOpenCents !== 20000) {
    throw new Error(`Expected totalOpenCents=20000, got ${studentReport.totals.totalOpenCents}`);
  }

  if (studentReport.invoices.length !== 2) {
    throw new Error(`Expected 2 invoices in student report, got ${studentReport.invoices.length}`);
  }

  // Guardian report: only invoices for guardian-1 (inv-1 paid, inv-2 pending)
  const guardianReport = await controller.getGuardianReport(reqTenant, 'guardian-1');

  if (guardianReport.guardian.id !== 'guardian-1') {
    throw new Error(`Expected guardian id guardian-1, got ${guardianReport.guardian.id}`);
  }

  if (guardianReport.totals.totalPaidCents !== 10000) {
    throw new Error(
      `Expected guardian totalPaidCents=10000, got ${guardianReport.totals.totalPaidCents}`
    );
  }

  if (guardianReport.totals.totalOpenCents !== 20000) {
    throw new Error(
      `Expected guardian totalOpenCents=20000, got ${guardianReport.totals.totalOpenCents}`
    );
  }

  if (guardianReport.invoices.length !== 2) {
    throw new Error(
      `Expected 2 invoices in guardian report, got ${guardianReport.invoices.length}`
    );
  }

  // eslint-disable-next-line no-console
  console.log('SchoolReportsController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
