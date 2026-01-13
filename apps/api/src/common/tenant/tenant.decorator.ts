import { applyDecorators, UseGuards } from '@nestjs/common';
import { RequireTenantGuard } from './require-tenant.guard';

export const TenantScoped = () => applyDecorators(UseGuards(RequireTenantGuard));
