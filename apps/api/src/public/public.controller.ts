import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { RegisterGuardianDto } from './dto/register-guardian.dto';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';

const EMAIL_VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Controller('public')
@UseGuards(CustomThrottlerGuard)
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService
  ) {}

  /**
   * GET /public/info
   * Medium rate limiting: 5 attempts per 10 minutes per IP
   */
  @Get('info')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 5 } })
  getPublicInfo() {
    return {
      app: 'PayFlow',
      version: '1.0.0',
      description: 'Multi-tenant school payment management system',
    };
  }

  /**
   * GET /public/tenant/:slug
   * Public tenant info lookup (name, logo, status)
   */
  @Get('tenant/:slug')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 5 } })
  getTenantInfo(@Param('slug') slug: string) {
    // TODO: Implement actual tenant lookup
    return {
      message: 'Public tenant info endpoint placeholder',
      slug,
      note: 'Tenant public info lookup to be implemented',
    };
  }

  /**
   * POST /public/leads
   * Captures demo requests from interested schools.
   * Rate limited as a public endpoint.
   */
  @Post('leads')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 5 } })
  async createLead(@Body() dto: CreateLeadDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const normalizedPhone = dto.phone.trim();

    await this.prisma.lead.create({
      data: {
        name: dto.name.trim(),
        schoolName: dto.schoolName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        status: 'NEW',
      },
    });

    // Captcha token is accepted in DTO for future use, but ignored for now.
    return { success: true };
  }

  /**
   * POST /public/register-guardian
   * Public endpoint for guardian self-registration.
   * Uses medium rate limiting and applies password policy.
   */
  @Post('register-guardian')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 5 } })
  async registerGuardian(@Body() dto: RegisterGuardianDto, @Req() req: Request) {
    const name = dto.name.trim();
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const schoolCode = dto.schoolCode.trim().toUpperCase();

    if (!name || !email || !phone || !dto.password || !dto.confirmPassword || !schoolCode) {
      throw new BadRequestException({
        code: 'validation_error',
        message: 'All fields are required',
      });
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException({
        code: 'password_mismatch',
        message: 'Password and confirmation do not match',
      });
    }

    this.passwordService.validateStrength(dto.password);

    const tenant = await this.prisma.tenant.findUnique({
      where: { schoolCode },
      select: { id: true, status: true },
    });

    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: 'school_code_not_found',
        message: 'School code is invalid or tenant is not active',
      });
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException({
        code: 'email_in_use',
        message: 'An account with this email already exists',
      });
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          type: 'GUARDIAN',
          status: 'PENDING_APPROVAL',
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'GUARDIAN',
        },
      });

      await tx.guardian.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          name,
          phone,
          status: 'ACTIVE',
        },
      });

      return { userId: user.id };
    });

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId: result.userId,
      actorType: 'PUBLIC',
      action: 'guardian.register',
      targetType: 'user',
      targetId: result.userId,
      metadata: {
        email,
        schoolCode,
      },
      ip,
      userAgent,
    });

    const verifyToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TOKEN_TTL_MS);

    await this.prisma.emailVerifyToken.create({
      data: {
        userId: result.userId,
        token: verifyToken,
        expiresAt,
      },
    });

    const appBaseUrl = process.env.APP_PUBLIC_URL || 'http://localhost:3000';
    const verifyLink = `${appBaseUrl}/public/verify-email?token=${encodeURIComponent(
      verifyToken
    )}`;

    await this.emailService.sendEmailVerification(email, {
      name,
      school: '',
      link: verifyLink,
    });

    return {
      success: true,
      pendingApproval: true,
    };
  }

  /**
   * GET /public/pay/sandbox/:invoiceId
   * Returns minimal public data for a sandbox invoice payment.
   */
  @Get('pay/sandbox/:invoiceId')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 20 } })
  async getSandboxInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() req: Request
  ) {
    const token = (req.query.token as string | undefined) || '';
    if (!token) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Missing payment token',
      });
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: {
          select: {
            name: true,
          },
        },
        guardian: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found',
      });
    }

    if (invoice.provider !== 'SANDBOX' || !invoice.providerReference) {
      throw new BadRequestException({
        code: 'invalid_provider',
        message: 'Invoice is not using sandbox provider',
      });
    }

    const expectedPrefix = 'sandbox_';
    if (!invoice.providerReference.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Payment token is invalid',
      });
    }

    const storedToken = invoice.providerReference.slice(expectedPrefix.length);
    if (!storedToken || storedToken !== token) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Payment token is invalid',
      });
    }

    // Simple expiration based on invoice creation time (24h)
    const maxAgeMs = 24 * 60 * 60 * 1000;
    const createdAt = invoice.createdAt;
    const age = Date.now() - createdAt.getTime();
    if (age > maxAgeMs) {
      throw new BadRequestException({
        code: 'token_expired',
        message: 'Payment link has expired',
      });
    }

    return {
      invoiceId: invoice.id,
      status: invoice.status,
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate.toISOString(),
      studentName: invoice.student?.name ?? null,
      guardianName: invoice.guardian?.name ?? null,
    };
  }

  /**
   * POST /public/pay/sandbox/:invoiceId/confirm
   * Confirms a sandbox payment and marks invoice as PAID.
   */
  @Post('pay/sandbox/:invoiceId/confirm')
  @Throttle({ medium: { ttl: 10 * 60 * 1000, limit: 20 } })
  async confirmSandboxPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() body: { method: 'PIX' | 'CARD' },
    @Req() req: Request
  ) {
    const token = (req.query.token as string | undefined) || '';
    if (!token) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Missing payment token',
      });
    }

    if (!body?.method || (body.method !== 'PIX' && body.method !== 'CARD')) {
      throw new BadRequestException({
        code: 'invalid_method',
        message: 'Invalid payment method',
      });
    }

    const invoice = (await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenant: {
          select: { name: true },
        },
        student: {
          select: { name: true },
        },
        guardian: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      },
    })) as any;

    if (!invoice) {
      throw new NotFoundException({
        code: 'invoice_not_found',
        message: 'Invoice not found',
      });
    }

    if (invoice.provider !== 'SANDBOX' || !invoice.providerReference) {
      throw new BadRequestException({
        code: 'invalid_provider',
        message: 'Invoice is not using sandbox provider',
      });
    }

    const expectedPrefix = 'sandbox_';
    if (!invoice.providerReference.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Payment token is invalid',
      });
    }

    const storedToken = invoice.providerReference.slice(expectedPrefix.length);
    if (!storedToken || storedToken !== token) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Payment token is invalid',
      });
    }

    const maxAgeMs = 24 * 60 * 60 * 1000;
    const createdAt = invoice.createdAt;
    const age = Date.now() - createdAt.getTime();
    if (age > maxAgeMs) {
      throw new BadRequestException({
        code: 'token_expired',
        message: 'Payment link has expired',
      });
    }

    if (invoice.status !== 'PENDING' && invoice.status !== 'OVERDUE') {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'Only pending or overdue invoices can be marked as paid',
      });
    }

    const paidAt = new Date();

    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt,
        paidMethod: 'SANDBOX',
      } as any,
    });

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: invoice.tenantId,
      actorUserId: null,
      actorType: 'PUBLIC',
      action: 'invoice.sandbox_paid',
      targetType: 'invoice',
      targetId: invoice.id,
      metadata: {
        method: body.method,
        provider: 'SANDBOX',
      },
      ip,
      userAgent,
    });

    const guardianEmail = invoice.guardian?.user?.email as string | undefined;
    if (guardianEmail) {
      await this.emailService.sendInvoicePaid({
        recipient: guardianEmail,
        studentName: invoice.student?.name ?? '',
        schoolName: invoice.tenant?.name ?? '',
        amountCents: invoice.amountCents,
        dueDate: invoice.dueDate,
        paidAt,
      });
    }

    return {
      success: true,
      status: 'PAID',
    };
  }
}
