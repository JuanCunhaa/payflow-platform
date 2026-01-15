import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class RequireTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { tenant?: { id: string; slug: string }; user?: CurrentUserPayload }>();
    if (!req.tenant) {
      throw new NotFoundException({ code: 'tenant_not_found', message: 'Tenant not found' });
    }

    // If user is authenticated, enforce tenant isolation:
    // - Platform users should not hit tenant-scoped routes directly
    // - User tenantId must match resolved tenant id
    const user = req.user;
    if (user) {
      if (user.userType === 'PLATFORM') {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Platform users must not access tenant-scoped endpoints directly',
        });
      }

      if (!user.tenantId || user.tenantId !== req.tenant.id) {
        throw new ForbiddenException({
          code: 'tenant_mismatch',
          message: 'Access denied for this tenant',
        });
      }
    }

    return true;
  }
}
