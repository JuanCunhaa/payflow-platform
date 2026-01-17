export type PaymentLinkResult = {
  url: string;
  providerReference: string;
};

export interface PaymentProvider {
  createPaymentLink(input: {
    invoiceId: string;
    amountCents: number;
    currency?: string;
  }): Promise<PaymentLinkResult>;
}

export const PAYMENT_PROVIDER_TOKEN = 'PAYMENT_PROVIDER';

