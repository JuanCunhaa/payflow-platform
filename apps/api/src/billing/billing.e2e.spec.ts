import { randomUUID } from 'crypto';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { SandboxPaymentProvider } from './sandbox-payment.provider';
import { PaymentService } from './payment.service';
import { SchoolInvoicesController } from '../school/invoices.controller';
import { PublicController } from '../public/public.controller';
import { EmailService } from '../notifications/email.service';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

type TenantRequest = {
  tenant?: { id: string; slug: string };
};

function createTenantRequest(tenantId: string, slug: string): TenantRequest {
  return {
    tenant: { id: tenantId, slug },
  };
}

async function run() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const auditService = new AuditService(prisma);
  const passwordService = new PasswordService();
  const paymentProvider = new SandboxPaymentProvider();
  const paymentService = new PaymentService(prisma, auditService, paymentProvider);
  const emailServiceMock = {
    sendInvoiceCreated: async (_params: unknown) => {},

    sendInvoicePaid: async (_params: unknown) => {},
  } as unknown as EmailService;

  const schoolInvoicesController = new SchoolInvoicesController(
    prisma,
    auditService,
    paymentService,
    emailServiceMock
  );

  const publicController = new PublicController(
    prisma,
    passwordService,
    auditService,
    emailServiceMock
  );

  const unique = randomUUID().slice(0, 8);
  const tenantSlug = `test-tenant-${unique}`;
  const tenantSchoolCode = `TEST-${unique.toUpperCase()}`;

  const tenant = await prisma.tenant.create({
    data: {
      name: `Test Tenant ${unique}`,
      slug: tenantSlug,
      schoolCode: tenantSchoolCode,
      status: 'ACTIVE',
    },
  });

  const grade = await prisma.grade.create({
    data: {
      tenantId: tenant.id,
      name: '1º ano - E2E',
    },
  });

  const classEntity = await prisma.class.create({
    data: {
      tenantId: tenant.id,
      gradeId: grade.id,
      name: '1A - E2E',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `guardian-e2e-${unique}@example.com`,
      name: 'Guardian E2E',
      passwordHash: 'hash',
      type: 'GUARDIAN',
      status: 'ACTIVE',
    },
  });

  const guardian = await prisma.guardian.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      name: 'Guardian E2E',
      phone: '11999999999',
      status: 'ACTIVE',
    },
  });

  const student = await prisma.student.create({
    data: {
      tenantId: tenant.id,
      classId: classEntity.id,
      name: 'Aluno E2E',
      status: 'ACTIVE',
    },
  });

  const reqTenant = createTenantRequest(tenant.id, tenant.slug) as TenantRequest;
  const schoolUser: CurrentUserPayload = {
    id: randomUUID(),
    email: `staff-e2e-${unique}@example.com`,
    userType: 'STAFF',
    tenantId: tenant.id,
    role: 'SCHOOL_ADMIN',
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDateIso = tomorrow.toISOString().slice(0, 10);

  const createResult = await schoolInvoicesController.createOneOffInvoice(
    reqTenant,
    {
      studentId: student.id,
      guardianId: guardian.id,
      amountCents: 12345,
      dueDate: dueDateIso,
      description: 'E2E one-off invoice',
    },
    schoolUser
  );

  const invoiceId = createResult.invoiceId;

  const paymentLinkResult = await schoolInvoicesController.createPaymentLink(
    reqTenant,
    invoiceId,
    schoolUser
  );

  if (!paymentLinkResult.paymentLink) {
    throw new Error('Expected paymentLink from createPaymentLink');
  }

  const linkUrl = new URL(paymentLinkResult.paymentLink, 'https://sandbox.local');
  const token = linkUrl.searchParams.get('token');

  if (!token) {
    throw new Error('Payment link is missing token query parameter');
  }

  const fakeReqGet = {
    query: { token },
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const sandboxInvoice = await publicController.getSandboxInvoice(invoiceId, fakeReqGet);

  if (sandboxInvoice.invoiceId !== invoiceId) {
    throw new Error('Sandbox invoice endpoint returned wrong invoiceId');
  }

  const fakeReqConfirm = {
    query: { token },
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  await publicController.confirmSandboxPayment(invoiceId, { method: 'PIX' }, fakeReqConfirm);

  const finalInvoice = (await prisma.invoice.findUnique({
    where: { id: invoiceId },
  })) as any;

  if (!finalInvoice) {
    throw new Error('Invoice missing after sandbox payment');
  }

  if (finalInvoice.status !== 'PAID') {
    throw new Error(`Expected invoice status PAID, got ${finalInvoice.status}`);
  }

  if (!finalInvoice.paidAt || finalInvoice.paidMethod !== 'SANDBOX') {
    throw new Error('Expected paidAt and paidMethod=SANDBOX after sandbox payment');
  }

  console.log('Billing E2E flow (one-off -> payment link -> sandbox pay) passed');

  await prisma.$disconnect();
}

run().catch(async (error) => {
  console.error(error);
  const prisma = new PrismaService();
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
