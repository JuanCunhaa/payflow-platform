import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { TenantController } from './tenant/tenant.controller';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { PublicController } from './public/public.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { PlatformLeadsController } from './platform/platform-leads.controller';
import { PlatformTenantsController } from './platform/platform-tenants.controller';
import { PlatformAuditController } from './platform/platform-audit.controller';
import { PrismaService } from './prisma/prisma.service';
import { TenantResolverMiddleware } from './common/tenant/tenant.middleware';
import { SchoolSettingsController } from './school/school-settings.controller';
import { GradesClassesController } from './school/grades-classes.controller';
import { StudentsController } from './school/students.controller';
import { GuardiansController } from './school/guardians.controller';
import { EmailService } from './notifications/email.service';
import { GuardianController } from './guardian/guardian.controller';
import { ContractsController } from './school/contracts.controller';
import { AdminJobsController } from './platform/admin-jobs.controller';
import { InvoiceJobsService } from './billing/invoice-jobs.service';
import { PaymentService } from './billing/payment.service';
import { PAYMENT_PROVIDER_TOKEN } from './billing/payment-provider';
import { SandboxPaymentProvider } from './billing/sandbox-payment.provider';
import { SchoolInvoicesController } from './school/invoices.controller';

@Module({
  imports: [
    // Rate limiting with in-memory store (default)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        // Login: 10 attempts per 5 minutes per IP
        ttl: 5 * 60 * 1000,
        limit: 10,
      },
      {
        name: 'medium',
        // Register / public endpoints: 5 attempts per 10 minutes per IP
        ttl: 10 * 60 * 1000,
        limit: 5,
      },
      {
        name: 'long',
        // Webhooks: higher volume but still protected
        ttl: 60 * 1000,
        limit: 100,
      },
    ]),
    // Authentication module
    AuthModule,
  ],
  controllers: [
    AppController,
    TenantController,
    HealthController,
    PublicController,
    WebhooksController,
    PlatformLeadsController,
    PlatformTenantsController,
    PlatformAuditController,
    AdminJobsController,
    SchoolSettingsController,
    GradesClassesController,
    StudentsController,
    GuardiansController,
    SchoolInvoicesController,
    GuardianController,
    ContractsController,
  ],
  providers: [
    PrismaService,
    EmailService,
    InvoiceJobsService,
    PaymentService,
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      useClass: SandboxPaymentProvider,
    },
    SandboxPaymentProvider,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Attach tenant (if resolvable) to every request; platform routes can ignore it.
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
