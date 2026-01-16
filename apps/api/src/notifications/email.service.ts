import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendGuardianApprovalEmail(recipient: string): Promise<void> {
    this.logger.log(`Simulated email: guardian approval sent to ${recipient}`);
  }

  async sendGuardianRejectionEmail(recipient: string): Promise<void> {
    this.logger.log(`Simulated email: guardian rejection sent to ${recipient}`);
  }
}

