import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { PaymentProvider } from './payment-provider';
import { PAYMENT_PROVIDER_TOKEN } from './payment-provider';

type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELED' | 'REFUNDED';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(PAYMENT_PROVIDER_TOKEN) private readonly provider: PaymentProvider
  ) {}

  async createPaymentLinkForInvoice(
    invoiceId: string,
    actorUserId: string | null = null
  ): Promise<{ paymentLink: string; provider: string }> {
    const invoice = (await this.prisma.invoice.findFirst({
      where: { id: invoiceId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found',
      });
    }

    if (invoice.paymentLink) {
      return {
        paymentLink: invoice.paymentLink as string,
        provider: (invoice.provider as string) ?? 'SANDBOX',
      };
    }

    const allowedStatuses: InvoiceStatus[] = ['PENDING', 'OVERDUE'];
    if (!allowedStatuses.includes(invoice.status as InvoiceStatus)) {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'Payment link can only be created for pending or overdue invoices',
      });
    }

    const result = await this.provider.createPaymentLink({
      invoiceId: invoice.id,
      amountCents: invoice.amountCents,
      currency: 'BRL',
    });

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      // Cast to any because the generated Prisma client in this environment
      // may not yet include the paymentLink field until migrations run.
      data: {
        provider: 'SANDBOX',
        providerReference: result.providerReference,
        paymentLink: result.url,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    await this.auditService.log({
      tenantId: invoice.tenantId,
      actorUserId: actorUserId ?? null,
      actorType: actorUserId ? 'USER' : 'SYSTEM',
      action: 'invoice.payment_link.created',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: {
        provider: 'SANDBOX',
        providerReference: result.providerReference,
      },
    });

    return { paymentLink: result.url, provider: 'SANDBOX' };
  }
}
