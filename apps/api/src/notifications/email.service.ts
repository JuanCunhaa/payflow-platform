import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER_TOKEN, type EmailProvider } from './email-provider';
import { renderEmailTemplate } from '../emails/templates';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: EmailProvider
  ) {}

  async sendGuardianApprovalEmail(
    recipient: string,
    params: { name?: string; school?: string; portalLink?: string }
  ): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.portalLink ?? `${baseUrl}/g`,
    };

    const { html, text } = renderEmailTemplate('guardian-approved', variables);

    await this.provider.send({
      to: recipient,
      subject: 'Sua conta de responsável foi aprovada',
      html,
      text,
      templateId: 'guardian-approved',
      variables,
    });
  }

  async sendGuardianRejectionEmail(
    recipient: string,
    params: { name?: string; school?: string; contactLink?: string }
  ): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.contactLink ?? baseUrl,
    };

    const { html, text } = renderEmailTemplate('guardian-rejected', variables);

    await this.provider.send({
      to: recipient,
      subject: 'Sua solicitação de acesso não foi aprovada',
      html,
      text,
      templateId: 'guardian-rejected',
      variables,
    });
  }

  async sendPasswordResetEmail(recipient: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await this.provider.send({
      to: recipient,
      subject: 'Instruções para redefinir sua senha',
      text:
        'Recebemos um pedido para redefinir sua senha. ' +
        'Se você não fez este pedido, pode ignorar este e-mail.',
      templateId: 'auth.password_reset',
      variables: {
        resetUrl,
        resetToken: token,
      },
    });
  }

  async sendEmailVerification(
    recipient: string,
    params: { name?: string; school?: string; link: string }
  ): Promise<void> {
    const variables = {
      name: params.name ?? '',
      school: params.school ?? '',
      amount: '',
      dueDate: '',
      link: params.link,
    };

    const { html, text } = renderEmailTemplate('verify-email', variables);

    await this.provider.send({
      to: recipient,
      subject: 'Confirme seu e-mail no PayFlow',
      html,
      text,
      templateId: 'verify-email',
      variables,
    });
  }
}

