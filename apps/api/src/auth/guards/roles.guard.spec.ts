import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AppRole } from '../roles.decorator';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

type MockRequest = {
  user?: CurrentUserPayload;
  tenant?: { id: string; slug: string };
};

function createExecutionContext(req: MockRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({} as any),
      getNext: () => ({} as any),
    }),
    getClass: () => ({} as any),
    getHandler: () => ({} as any),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    getType: () => 'http',
    switchToRpc: () => ({} as any),
    switchToWs: () => ({} as any),
  } as unknown as ExecutionContext;
}

async function run() {
  const reflector = {
    getAllAndOverride: (_key: string, _targets: unknown[]) => [] as AppRole[],
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  // Helper to test required roles via overriding reflector
  function canActivate(req: MockRequest, roles: AppRole[]): boolean {
    (reflector as any).getAllAndOverride = () => roles;
    const ctx = createExecutionContext(req, roles);
    return guard.canActivate(ctx);
  }

  // Platform access to /platform (no tenant) with PLATFORM_ADMIN
  const platformReq: MockRequest = {
    user: {
      id: 'u1',
      email: 'platform@payflow.com',
      userType: 'PLATFORM',
    },
  };
  if (!canActivate(platformReq, ['PLATFORM_ADMIN'])) {
    throw new Error('Platform user should be allowed for PLATFORM_ADMIN role');
  }

  // Staff A cannot access tenant B
  const staffReq: MockRequest = {
    user: {
      id: 'u2',
      email: 'staff@tenant-a.com',
      userType: 'STAFF',
      tenantId: 'tenant-a',
      role: 'SCHOOL_ADMIN',
    },
    tenant: { id: 'tenant-b', slug: 'tenant-b' },
  };

  let denied = false;
  try {
    canActivate(staffReq, ['SCHOOL_ADMIN']);
  } catch {
    denied = true;
  }
  if (!denied) {
    throw new Error('Staff from tenant A should not access tenant B');
  }

  console.log('RolesGuard tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
