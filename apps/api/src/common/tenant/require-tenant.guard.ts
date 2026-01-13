import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RequireTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { tenant?: { id: string; slug: string } }>();
    if (!req.tenant) {
      throw new NotFoundException({ code: 'tenant_not_found', message: 'Tenant not found' });
    }
    return true;
  }
}
