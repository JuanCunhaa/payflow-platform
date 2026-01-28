import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import type { EmailMessage, EmailProvider } from './email-provider';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is not defined');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail =
      process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev';
  }

  async send(message: EmailMessage): Promise<void> {
    const { to, subject, html, text } = message;

    try {
      const data = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html: html || '',
        text: text || '',
      });

      if (data.error) {
        this.logger.error(`Failed to send email via Resend: ${data.error.message}`);
        throw new Error(data.error.message);
      }

      this.logger.log(`Email sent via Resend to ${to} (ID: ${data.data?.id})`);
    } catch (error) {
      this.logger.error(`Error sending email via Resend: ${error}`);
      throw error;
    }
  }
}
