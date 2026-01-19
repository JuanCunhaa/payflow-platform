import { Injectable, Logger } from '@nestjs/common';
import type { EmailMessage, EmailProvider } from './email-provider';

@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async send(message: EmailMessage): Promise<void> {
    const { to, subject, templateId, text, html, variables } = message;

    this.logger.log({
      provider: 'console',
      to,
      subject,
      templateId,
      hasText: !!text,
      hasHtml: !!html,
      variableKeys: variables ? Object.keys(variables) : [],
    });
  }
}

