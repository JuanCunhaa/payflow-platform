import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PrismaClient } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/decorators/current-user.decorator';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

type TenantStatus = 'ACTIVE' | 'DRAFT' | 'SUSPENDED';

const ALLOWED_TENANT_STATUS: TenantStatus[] = ['ACTIVE', 'DRAFT', 'SUSPENDED'];

type PrismaTenantClient = Pick<PrismaClient, 'tenant' | 'user' | 'membership'>;

function parseTenantStatusOrUndefined(
  statusParam?: string,
): TenantStatus | undefined {
  if (!statusParam) return undefined;
  if (ALLOWED_TENANT_STATUS.includes(statusParam as TenantStatus)) {
    return statusParam as TenantStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid tenant status',
  });
}

function slugifyName(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return normalized || 'tenant';
}

async function ensureUniqueSlug(
  prisma: PrismaTenantClient,
  baseSlug: string,
): Promise<string> {
  let candidate = baseSlug;
  let counter = 1;

  for (;;) {
    const existing = await prisma.tenant.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

async function ensureUniqueSchoolCode(
  prisma: PrismaTenantClient,
  schoolCode: string,
  ignoreId?: string,
): Promise<void> {
  const existing = await prisma.tenant.findUnique({
    where: { schoolCode },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreId) {
    throw new BadRequestException({
      code: 'school_code_in_use',
      message: 'School code is already in use',
    });
  }
}

async function generateUniqueSchoolCode(
  prisma: PrismaTenantClient,
  baseSlug: string,
): Promise<string> {
  const codeBase =
    baseSlug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'SCHOOL';

  let attempt = 1;
  for (;;) {
    const suffix = String(attempt).padStart(4, '0');
    const candidate = `${codeBase}-${suffix}`;
    const existing = await prisma.tenant.findUnique({
      where: { schoolCode: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
    attempt += 1;
  }
}

function generateInitialPassword(): string {
  const base = Math.random().toString(36).slice(-8);
  return `Admin@${base}`;
}

@Controller('platform/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
export class PlatformTenantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  async listTenants(
    @Query('status') statusParam?: string,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ) {
    const status = parseTenantStatusOrUndefined(statusParam);
    const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
    const pageSizeRaw = parseInt(pageSizeParam ?? '20', 10) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);

    const where = status ? { status } : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.tenant.count({ where }),
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }

  @Post()
  async createTenant(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'invalid_name',
        message: 'Name is required',
      });
    }

    const slugInput = dto.slug?.trim().toLowerCase();
    let baseSlug = slugInput && slugInput.length > 0 ? slugInput : slugifyName(name);
    if (!/^[a-z0-9-]+$/.test(baseSlug)) {
      throw new BadRequestException({
        code: 'invalid_slug',
        message: 'Slug must contain only [a-z0-9-]',
      });
    }

    const adminEmail = dto.adminEmail.trim().toLowerCase();
    if (!adminEmail) {
      throw new BadRequestException({
        code: 'invalid_admin_email',
        message: 'Admin email is required',
      });
    }

    let initialPassword = dto.adminPassword?.trim();
    if (!initialPassword) {
      initialPassword = generateInitialPassword();
    }
    this.passwordService.validateStrength(initialPassword);
    const passwordHash = await this.passwordService.hash(initialPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      const prismaTx = tx as unknown as PrismaTenantClient;

      // Ensure admin email not already in use
      const existingUser = await prismaTx.user.findUnique({
        where: { email: adminEmail },
        select: { id: true },
      });
      if (existingUser) {
        throw new BadRequestException({
          code: 'admin_email_in_use',
          message: 'Admin email is already in use',
        });
      }

      const uniqueSlug = await ensureUniqueSlug(prismaTx, baseSlug);

      let schoolCode = dto.schoolCode?.trim();
      if (schoolCode && schoolCode.length > 0) {
        await ensureUniqueSchoolCode(prismaTx, schoolCode);
      } else {
        schoolCode = await generateUniqueSchoolCode(prismaTx, uniqueSlug);
      }

      const tenant = await prismaTx.tenant.create({
        data: {
          name,
          slug: uniqueSlug,
          schoolCode,
          status: 'DRAFT',
        },
      });

      const adminUser = await prismaTx.user.create({
        data: {
          email: adminEmail,
          name: dto.adminName?.trim() || null,
          passwordHash,
          type: 'STAFF',
          status: 'ACTIVE',
        },
      });

      await prismaTx.membership.create({
        data: {
          userId: adminUser.id,
          tenantId: tenant.id,
          role: 'SCHOOL_ADMIN',
        },
      });

      return { tenant, adminUser };
    });

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: result.tenant.id,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'platform.tenant.create',
      targetType: 'tenant',
      targetId: result.tenant.id,
      metadata: {
        tenantName: result.tenant.name,
        adminUserId: result.adminUser.id,
        adminEmail: result.adminUser.email,
      },
      ip,
      userAgent,
    });

    return {
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        schoolCode: result.tenant.schoolCode,
        status: result.tenant.status,
      },
      admin: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name,
      },
      adminInitialPassword: dto.adminPassword ? null : initialPassword,
    };
  }

  @Put(':id')
  async updateTenant(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException({
          code: 'invalid_name',
          message: 'Name is required',
        });
      }
      data.name = name;
    }

    if (dto.slug !== undefined) {
      const slug = dto.slug.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(slug)) {
        throw new BadRequestException({
          code: 'invalid_slug',
          message: 'Slug must contain only [a-z0-9-]',
        });
      }
      data.slug = slug;
    }

    if (dto.schoolCode !== undefined) {
      const schoolCode = dto.schoolCode.trim();
      if (!schoolCode) {
        throw new BadRequestException({
          code: 'invalid_school_code',
          message: 'School code cannot be empty',
        });
      }
      await ensureUniqueSchoolCode(
        this.prisma as unknown as PrismaTenantClient,
        schoolCode,
        id,
      );
      data.schoolCode = schoolCode;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException({
        code: 'no_changes',
        message: 'No fields to update',
      });
    }

    let tenant;
    try {
      tenant = await this.prisma.tenant.update({
        where: { id },
        data,
      });
    } catch {
      throw new NotFoundException({
        code: 'tenant_not_found',
        message: 'Tenant not found',
      });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'platform.tenant.update',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: {
        updatedFields: Object.keys(data),
      },
      ip,
      userAgent,
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schoolCode: tenant.schoolCode,
        status: tenant.status,
      },
    };
  }

  @Post(':id/activate')
  async activateTenant(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    let tenant;
    try {
      tenant = await this.prisma.tenant.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
    } catch {
      throw new NotFoundException({
        code: 'tenant_not_found',
        message: 'Tenant not found',
      });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'platform.tenant.activate',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: {},
      ip,
      userAgent,
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schoolCode: tenant.schoolCode,
        status: tenant.status,
      },
    };
  }

  @Post(':id/suspend')
  async suspendTenant(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    let tenant;
    try {
      tenant = await this.prisma.tenant.update({
        where: { id },
        data: { status: 'SUSPENDED' },
      });
    } catch {
      throw new NotFoundException({
        code: 'tenant_not_found',
        message: 'Tenant not found',
      });
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
      req.ip ||
      null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'platform.tenant.suspend',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: {},
      ip,
      userAgent,
    });

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        schoolCode: tenant.schoolCode,
        status: tenant.status,
      },
    };
  }
}

