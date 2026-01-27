import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER_TOKEN, type EmailProvider } from './email-provider';
import { renderEmailTemplate } from '../emails/templates';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: EmailProvider
  ) { }

  async sendGuardianApprovalEmail(
    recipient: string,
    params: { name?: string; school?: string; portalLink?: string },
    locale: string = 'pt-BR'
  ): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'https://cobranex.xyz';
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.portalLink ?? `${baseUrl}/g`,
    };

    const { html, text, subject } = renderEmailTemplate('guardian-approved', variables, locale);

    await this.provider.send({
      to: recipient,
      subject,
      html,
      text,
      templateId: 'guardian-approved',
      variables,
    });
  }

  async sendGuardianRejectionEmail(
    recipient: string,
    params: { name?: string; school?: string; contactLink?: string },
    locale: string = 'pt-BR'
  ): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'https://cobranex.xyz';
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.contactLink ?? baseUrl,
    };

    const { html, text, subject } = renderEmailTemplate('guardian-rejected', variables, locale);

    await this.provider.send({
      to: recipient,
      subject,
      html,
      text,
      templateId: 'guardian-rejected',
      variables,
    });
  }

  async sendPasswordResetEmail(recipient: string, token: string, locale: string = 'pt-BR'): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'https://cobranex.xyz';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const variables = {
      resetUrl,
      resetToken: token,
    };

    const { html, text, subject } = renderEmailTemplate('auth.password_reset', variables, locale);

    await this.provider.send({
      to: recipient,
      subject,
      html,
      text,
      templateId: 'auth.password_reset',
      variables,
    });
  }

  async sendEmailVerification(
    recipient: string,
    params: { name?: string; school?: string; link: string },
    locale: string = 'pt-BR'
  ): Promise<void> {
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.link,
    };

    const { html, text, subject } = renderEmailTemplate('verify-email', variables, locale);

    await this.provider.send({
      to: recipient,
      subject,
      html,
      text,
      templateId: 'verify-email',
      variables,
    });
  }

  async sendInvoiceCreated(params: {
    recipient: string;
    studentName: string;
    schoolName: string;
    amountCents: number;
    dueDate: Date;
    paymentLink?: string | null;
  }, locale: string = 'pt-BR'): Promise<void> {
    const amount = formatCurrencyBRL(params.amountCents);
    const dueDateStr = formatDateBR(params.dueDate);

    const variables = {
      name: params.studentName,
      school: params.schoolName,
      amount,
      dueDate: dueDateStr,
      link: params.paymentLink ?? '',
    };

    const { html, text, subject } = renderEmailTemplate('invoice-created', variables, locale);

    await this.provider.send({
      to: params.recipient,
      subject,
      html,
      text,
      templateId: 'invoice-created',
      variables,
    });
  }

  async sendInvoiceOverdue(params: {
    recipient: string;
    studentName: string;
    schoolName: string;
    amountCents: number;
    dueDate: Date;
    paymentLink?: string | null;
  }, locale: string = 'pt-BR'): Promise<void> {
    const amount = formatCurrencyBRL(params.amountCents);
    const dueDateStr = formatDateBR(params.dueDate);

    const variables = {
      name: params.studentName,
      school: params.schoolName,
      amount,
      dueDate: dueDateStr,
      link: params.paymentLink ?? '',
    };

    const { html, text, subject } = renderEmailTemplate('invoice-overdue', variables, locale);

    await this.provider.send({
      to: params.recipient,
      subject,
      html,
      text,
      templateId: 'invoice-overdue',
      variables,
    });
  }

  async sendInvoicePaid(params: {
    recipient: string;
    studentName: string;
    schoolName: string;
    amountCents: number;
    dueDate: Date;
    paidAt: Date;
  }, locale: string = 'pt-BR'): Promise<void> {
    const amount = formatCurrencyBRL(params.amountCents);
    const dueDateStr = formatDateBR(params.dueDate);
    const paidDateStr = formatDateBR(params.paidAt);

    const variables = {
      name: params.studentName,
      school: params.schoolName,
      amount,
      dueDate: dueDateStr,
      paidDate: paidDateStr,
      link: '',
    };

    const { html, text, subject } = renderEmailTemplate('invoice-paid', variables, locale);

    await this.provider.send({
      to: params.recipient,
      subject,
      html,
      text,
      templateId: 'invoice-paid',
      variables,
    });
  }
}

function formatCurrencyBRL(amountCents: number): string {
  const value = amountCents / 100;
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDateBR(date: Date): string {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}
