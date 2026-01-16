import { BadRequestException, Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { CreateLeadDto } from './dto/create-lead.dto';
import { RegisterGuardianDto } from './dto/register-guardian.dto';

@Controller('public')
@UseGuards(CustomThrottlerGuard)
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
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
  async registerGuardian(@Body() dto: RegisterGuardianDto) {
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

    await this.prisma.$transaction(async (tx) => {
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
    });

    return {
      success: true,
      pendingApproval: true,
    };
  }
}
