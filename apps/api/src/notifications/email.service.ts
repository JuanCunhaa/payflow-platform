import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER_TOKEN, type EmailProvider } from './email-provider';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: EmailProvider
  ) {}

  async sendGuardianApprovalEmail(recipient: string): Promise<void> {
    await this.provider.send({
      to: recipient,
      subject: 'Sua conta de responsável foi aprovada',
      text: 'Sua conta para acesso ao PayFlow foi aprovada. Você já pode fazer login.',
      templateId: 'guardian.approval',
    });
  }

  async sendGuardianRejectionEmail(recipient: string): Promise<void> {
    await this.provider.send({
      to: recipient,
      subject: 'Sua solicitação de acesso não foi aprovada',
      text: 'Sua solicitação de acesso ao portal do responsável não foi aprovada neste momento.',
      templateId: 'guardian.rejection',
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
}
