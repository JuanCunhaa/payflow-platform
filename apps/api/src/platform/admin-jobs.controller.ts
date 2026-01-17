import { Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { InvoiceJobsService } from '../billing/invoice-jobs.service';

@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
export class AdminJobsController {
  constructor(private readonly invoiceJobsService: InvoiceJobsService) {}

  @Post('generate-invoices')
  async manuallyGenerateInvoices() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const result = await this.invoiceJobsService.generateMonthlyInvoices();

    return {
      job: 'generate_invoices',
      ...result,
    };
  }

  @Post('recalculate-overdue')
  async manuallyRecalculateOverdue() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }

    const result = await this.invoiceJobsService.recalculateOverdueInvoices();

    return {
      job: 'recalculate_overdue',
      ...result,
    };
  }
}
