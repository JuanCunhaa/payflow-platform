import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('public')
@UseGuards(CustomThrottlerGuard)
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

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
}
