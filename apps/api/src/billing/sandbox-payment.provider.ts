import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { PaymentLinkResult, PaymentProvider } from './payment-provider';

@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  async createPaymentLink(input: {
    invoiceId: string;
    amountCents: number;
    currency?: string;
  }): Promise<PaymentLinkResult> {
    const token = randomUUID();
    const reference = `sandbox_${token}`;

    const url = `/pay/sandbox/${encodeURIComponent(
      input.invoiceId
    )}?token=${encodeURIComponent(token)}`;

    return {
      url,
      providerReference: reference,
    };
  }
}
