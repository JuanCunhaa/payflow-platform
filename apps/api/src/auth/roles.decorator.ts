import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type AppRole =
  | 'PLATFORM_ADMIN'
  | 'PLATFORM_SUPPORT'
  | 'SCHOOL_ADMIN'
  | 'FINANCE'
  | 'SECRETARY'
  | 'READONLY'
  | 'GUARDIAN';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
