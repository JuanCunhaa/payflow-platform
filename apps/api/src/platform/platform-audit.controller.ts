import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

type PrismaAuditClient = Pick<PrismaClient, 'auditLog' | 'tenant' | 'user'>;

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({
      code: 'invalid_date',
      message: 'Invalid date format',
    });
  }
  return date;
}

@Controller('platform/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PLATFORM_ADMIN', 'PLATFORM_SUPPORT')
export class PlatformAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listAuditLogs(
    @Query('tenantId') tenantId?: string,
    @Query('action') action?: string,
    @Query('actorEmail') actorEmail?: string,
    @Query('from') fromParam?: string,
    @Query('to') toParam?: string,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string
  ) {
    const prisma = this.prisma as unknown as PrismaAuditClient;

    const from = parseDate(fromParam);
    const to = parseDate(toParam);

    const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
    const limitRaw = parseInt(limitParam ?? '20', 10) || 20;
    const pageSize = Math.min(Math.max(limitRaw, 1), 100);

    const where: Prisma.AuditLogWhereInput = {};

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    let actorIdsFilter: string[] | undefined;
    if (actorEmail) {
      const normalizedEmail = actorEmail.trim().toLowerCase();
      const users = await prisma.user.findMany({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (users.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 1,
        };
      }

      actorIdsFilter = users.map((u) => u.id);
      where.actorUserId = { in: actorIdsFilter };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        where.createdAt.gte = from;
      }
      if (to) {
        where.createdAt.lte = to;
      }
    }

    const [total, logs] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const tenantIds = Array.from(
      new Set(logs.map((log) => log.tenantId).filter((id): id is string => !!id))
    );
    const actorIds = Array.from(
      new Set(logs.map((log) => log.actorUserId).filter((id): id is string => !!id))
    );

    const [tenants, actors] = await Promise.all([
      tenantIds.length
        ? prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true, slug: true },
          })
        : Promise.resolve([]),
      actorIds.length
        ? prisma.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, email: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));
    const actorMap = new Map(actors.map((u) => [u.id, u]));

    return {
      items: logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        tenant: log.tenantId ? (tenantMap.get(log.tenantId) ?? null) : null,
        actor: log.actorUserId ? (actorMap.get(log.actorUserId) ?? null) : null,
        actorType: log.actorType,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        ip: log.ip,
        userAgent: log.userAgent,
        metadata: log.metadata,
      })),
      total,
      page,
      pageSize,
      totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
    };
  }
}
