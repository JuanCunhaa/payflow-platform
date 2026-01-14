import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppRole, ROLES_KEY } from '../roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

type TenantRequest = Request & {
  user?: CurrentUserPayload;
  tenant?: { id: string; slug: string };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    // If no roles are required, allow access.
    if (requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    const userRole = user.role as AppRole | undefined;

    // Platform roles (no tenant context expected)
    const requiresPlatformRole = requiredRoles.some((role) => role.startsWith('PLATFORM_'));
    if (requiresPlatformRole) {
      if (user.userType !== 'PLATFORM') {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Platform role required',
        });
      }
      if (req.tenant) {
        throw new ForbiddenException({
          code: 'forbidden',
          message: 'Platform routes should not use tenant context',
        });
      }
      return true;
    }

    // Tenant roles: require tenant context and matching tenantId on JWT
    if (!req.tenant || !user.tenantId || user.tenantId !== req.tenant.id) {
      throw new ForbiddenException({
        code: 'tenant_mismatch',
        message: 'Access denied for this tenant',
      });
    }

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException({
        code: 'forbidden',
        message: 'Insufficient role',
      });
    }

    return true;
  }
}
