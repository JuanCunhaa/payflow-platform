import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';

@Controller('public')
@UseGuards(CustomThrottlerGuard)
export class PublicController {
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
}
