import { BadRequestException } from '@nestjs/common';
import { SchoolReportsController } from './reports.controller';
import { PrismaService } from '../prisma/prisma.service';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

type InvoiceEntity = {
  id: string;
  tenantId: string;
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
      amountCents: 20000,
      dueDate: mkDate('2026-01-15'),
      status: 'PENDING',
    },
    {
      id: 'inv-3',
      tenantId,
      amountCents: 30000,
      dueDate: mkDate('2025-12-20'),
      status: 'OVERDUE',
    },
    // Other tenant invoice (should be ignored)
    {
      id: 'inv-4',
      tenantId: otherTenantId,
      amountCents: 50000,
      dueDate: mkDate('2026-01-12'),
      status: 'PAID',
    }
  );

  const prismaMock = {
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
  const summaryRange = await controller.getSummary(
    reqTenant,
    '2026-01-01',
    '2026-01-31'
  );

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
    throw new Error(`Expected range overdueInvoicesCount=0, got ${summaryRange.overdueInvoicesCount}`);
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

  await controller.exportInvoicesCsv(
    reqTenant,
    '2026-01-01',
    '2026-01-31',
    'PAID',
    resMock,
  );

  if (headers['Content-Type'] !== 'text/csv; charset=utf-8') {
    throw new Error(
      `Expected Content-Type to be text/csv; charset=utf-8, got ${headers['Content-Type']}`,
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
  if (
    header !==
    'aluno,responsavel,valor,vencimento,status,pago_em,metodo_pagamento'
  ) {
    throw new Error(`Unexpected CSV header: ${header}`);
  }

  const row = lines[1];
  if (!row.includes('Aluno Pago') || !row.includes('Responsável Pago')) {
    throw new Error('CSV row must contain student and guardian names');
  }

  if (!row.includes('100.00') || !row.includes('PAID')) {
    throw new Error('CSV row must contain amount 100.00 and status PAID');
  }

  // eslint-disable-next-line no-console
  console.log('SchoolReportsController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
