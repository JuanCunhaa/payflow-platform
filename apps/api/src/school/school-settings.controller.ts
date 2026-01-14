import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../common/tenant/require-tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser, CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';
import { AuditService } from '../audit/audit.service';

type TenantRequest = Request & {
  tenant?: { id: string; slug: string };
};

@Controller('school')
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
export class SchoolSettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  @Get('settings')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async getSettings(@Req() req: TenantRequest) {
    const tenantId = req.tenant!.id;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        settingsJson: true,
      },
    });

    const settings = (tenant?.settingsJson as { displayName?: string; contactEmail?: string; contactPhone?: string } | null) || {};

    return {
      displayName: settings.displayName ?? tenant?.name ?? null,
      contactEmail: settings.contactEmail ?? null,
      contactPhone: settings.contactPhone ?? null,
    };
  }

  @Put('settings')
  @Roles('SCHOOL_ADMIN', 'SECRETARY')
  async updateSettings(
    @Req() req: TenantRequest,
    @Body() dto: UpdateSchoolSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const tenantId = req.tenant!.id;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        settingsJson: true,
      },
    });

    const previous =
      (tenant?.settingsJson as { displayName?: string; contactEmail?: string; contactPhone?: string } | null) ||
      {};

    const nextSettings = {
      displayName: dto.displayName ?? previous.displayName ?? tenant?.name ?? null,
      contactEmail: dto.contactEmail ?? previous.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? previous.contactPhone ?? null,
    };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settingsJson: nextSettings,
      },
    });

    const changes: Record<string, { before: string | null; after: string | null }> = {};
    for (const key of ['displayName', 'contactEmail', 'contactPhone'] as const) {
      const beforeValue =
        previous[key] ??
        (key === 'displayName' ? tenant?.name ?? null : null);
      const afterValue = nextSettings[key];
      if (beforeValue !== afterValue) {
        changes[key] = {
          before: beforeValue ?? null,
          after: afterValue ?? null,
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.auditService.log({
        tenantId,
        actorUserId: user.id,
        actorType: 'USER',
        action: 'tenant.settings.update',
        targetType: 'tenant',
        targetId: tenantId,
        metadata: {
          changes,
        },
      });
    }

    return nextSettings;
  }
}
