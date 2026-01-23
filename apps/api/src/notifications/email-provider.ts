export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER';
