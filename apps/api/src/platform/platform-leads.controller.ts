import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
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
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { AuditService } from '../audit/audit.service';

type LeadStatus = 'NEW' | 'CONTACTED' | 'CONVERTED';

const ALLOWED_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'CONVERTED'];

type PrismaLeadsClient = Pick<PrismaClient, 'lead' | 'tenant'>;

function parseStatusOrUndefined(statusParam?: string): LeadStatus | undefined {
  if (!statusParam) return undefined;
  if (ALLOWED_STATUSES.includes(statusParam as LeadStatus)) {
    return statusParam as LeadStatus;
  }
  throw new BadRequestException({
    code: 'invalid_status',
    message: 'Invalid lead status',
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

async function ensureUniqueSlug(prisma: PrismaLeadsClient, baseSlug: string): Promise<string> {
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

async function generateUniqueSchoolCode(
  prisma: PrismaLeadsClient,
  baseSlug: string
): Promise<string> {
  const codeBase =
    baseSlug
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 8) || 'SCHOOL';

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

@Controller('platform/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
export class PlatformLeadsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  async listLeads(
    @Query('status') statusParam?: string,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string
  ) {
    const status = parseStatusOrUndefined(statusParam);
    const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
    const pageSizeRaw = parseInt(pageSizeParam ?? '20', 10) || 20;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);

    const where = status ? { status } : {};

    const [total, items] = await this.prisma.$transaction([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
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

  @Patch(':id')
  async updateLeadStatus(@Param('id') id: string, @Body('status') statusParam: string) {
    const status = parseStatusOrUndefined(statusParam);
    if (!status) {
      throw new BadRequestException({
        code: 'invalid_status',
        message: 'Status is required',
      });
    }

    try {
      const lead = await this.prisma.lead.update({
        where: { id },
        data: { status },
      });
      return { lead };
    } catch {
      throw new NotFoundException({
        code: 'lead_not_found',
        message: 'Lead not found',
      });
    }
  }

  @Post(':id/convert-to-tenant')
  async convertToTenant(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      throw new NotFoundException({
        code: 'lead_not_found',
        message: 'Lead not found',
      });
    }

    const baseSlug = slugifyName(lead.schoolName);

    const tenant = await this.prisma.$transaction(async (prismaTx) => {
      const uniqueSlug = await ensureUniqueSlug(prismaTx as PrismaLeadsClient, baseSlug);
      const schoolCode = await generateUniqueSchoolCode(prismaTx as PrismaLeadsClient, uniqueSlug);

      const createdTenant = await prismaTx.tenant.create({
        data: {
          name: lead.schoolName,
          slug: uniqueSlug,
          schoolCode,
          status: 'DRAFT',
        },
      });

      await prismaTx.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' },
      });

      return createdTenant;
    });

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || null;
    const userAgent = (req.headers['user-agent'] as string | undefined) || null;

    await this.auditService.log({
      tenantId: tenant.id,
      actorUserId: user.id,
      actorType: 'USER',
      action: 'platform.lead.convert_to_tenant',
      targetType: 'tenant',
      targetId: tenant.id,
      metadata: {
        leadId: lead.id,
        leadEmail: lead.email,
        leadSchoolName: lead.schoolName,
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
}
