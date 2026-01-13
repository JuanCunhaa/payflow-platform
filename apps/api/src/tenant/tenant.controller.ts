import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { TenantScoped } from '../common/tenant/tenant.decorator';

@Controller('tenant')
export class TenantController {
  @Get('ping')
  @TenantScoped()
  ping(@Req() req: Request) {
    return { ok: true, tenant: (req as any).tenant };
  }
}
