import { BadRequestException } from '@nestjs/common';
import { SchoolInvoicesController } from './invoices.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PaymentService } from '../billing/payment.service';
import { EmailService } from '../notifications/email.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

type TenantRequest = {
  tenant?: { id: string; slug: string };
};

function createTenantRequest(tenantId: string): TenantRequest {
  return {
    tenant: { id: tenantId, slug: 'tenant-slug' },
  };
}

async function run() {
  const tenantId = 'tenant-1';
  const studentId = 'student-1';
  const guardianId = 'guardian-1';

  const createdInvoices: any[] = [];
  let lastAudit: any | null = null;
  let lastPaymentLinkCall: { invoiceId: string } | null = null;

  const prismaMock = {
    tenant: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      findUnique: async (_args: { where: { id: string }; select?: { name?: true } }) => ({
        name: 'Escola Teste',
      }),
    },
    student: {
      findFirst: async (args: {
        where: { id: string; tenantId: string };
        select?: { id?: true; name?: true };
      }) => {
        if (args.where.id === studentId && args.where.tenantId === tenantId) {
          return { id: studentId, name: 'Aluno Teste' };
        }
        return null;
      },
    },
    guardian: {
      findFirst: async (args: {
        where: { id: string; tenantId: string };
        select?: { id?: true; name?: true; user?: { select: { email: true } } };
      }) => {
        if (args.where.id === guardianId && args.where.tenantId === tenantId) {
          return {
            id: guardianId,
            name: 'Responsável Teste',
            user: { email: 'guardian@example.com' },
          };
        }
        return null;
      },
    },
    invoice: {
      create: async (args: { data: any }) => {
        const id = `inv-${createdInvoices.length + 1}`;
        const record = { id, ...args.data };
        createdInvoices.push(record);
        return record;
      },
    },
    invoiceCommunication: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      findFirst: async (_args: unknown) => null,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      create: async (_args: unknown) => {},
    },
  };

  const auditMock = {
    log: async (input: any) => {
      lastAudit = input;
    },
  };

  const paymentServiceMock = {
    createPaymentLinkForInvoice: async (invoiceId: string) => {
      lastPaymentLinkCall = { invoiceId };
      return { paymentLink: `https://sandbox/${invoiceId}`, provider: 'SANDBOX' };
    },
  } as unknown as PaymentService;

  const emailServiceMock = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendInvoiceCreated: async (_params: unknown) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sendInvoicePaid: async (_params: unknown) => {},
  } as unknown as EmailService;

  const controller = new SchoolInvoicesController(
    prismaMock as unknown as PrismaService,
    auditMock as unknown as AuditService,
    paymentServiceMock,
    emailServiceMock
  );

  const req = createTenantRequest(tenantId) as TenantRequest;
  const user: CurrentUserPayload = {
    id: 'user-1',
    email: 'staff@example.com',
    userType: 'STAFF',
    tenantId,
    role: 'SCHOOL_ADMIN',
  };

  const today = new Date();
  const dueDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const result = await controller.createOneOffInvoice(
    req,
    {
      studentId,
      guardianId,
      amountCents: 15000,
      dueDate: dueDate.toISOString().slice(0, 10),
      description: 'Passeio pedagógico',
    },
    user
  );

  if (!result.invoiceId) {
    throw new Error('Expected invoiceId in response');
  }

  if (createdInvoices.length !== 1) {
    throw new Error('Expected one invoice to be created');
  }

  const invoice = createdInvoices[0];
  if (invoice.tenantId !== tenantId) {
    throw new Error('Invoice must be tenant-scoped');
  }
  if (invoice.contractId !== null) {
    throw new Error('One-off invoice must have contractId = null');
  }
  if (invoice.status !== 'PENDING') {
    throw new Error('One-off invoice must start as PENDING');
  }
  if (invoice.provider !== 'SANDBOX') {
    throw new Error('One-off invoice provider must be SANDBOX');
  }

  if (!lastAudit || lastAudit.action !== 'invoice.oneoff.create') {
    throw new Error('Audit log for invoice.oneoff.create was not recorded');
  }

  let threw = false;
  try {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    await controller.createOneOffInvoice(
      req,
      {
        studentId,
        guardianId,
        amountCents: 15000,
        dueDate: past.toISOString().slice(0, 10),
        description: 'Old date',
      },
      user
    );
  } catch (error) {
    threw = error instanceof BadRequestException;
  }

  if (!threw) {
    throw new Error('Expected BadRequestException for past due date');
  }

  // eslint-disable-next-line no-console
  console.log('SchoolInvoicesController tests passed');
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
