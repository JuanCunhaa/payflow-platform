import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AuditActorType = 'SYSTEM' | 'USER' | 'PUBLIC';

export interface AuditLogInput {
  tenantId?: string | null;
  actorUserId?: string | null;
  actorType: AuditActorType;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  private get auditLogRepo() {
    return this.prisma.auditLog;
  }

  private sanitizeMetadata(metadata: unknown): unknown {
    if (metadata === null || metadata === undefined) return null;

    if (Array.isArray(metadata)) {
      return metadata.map((item) => this.sanitizeMetadata(item));
    }

    if (typeof metadata !== 'object') {
      return metadata;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('token')) {
        result[key] = '[redacted]';
      } else {
        result[key] = this.sanitizeMetadata(value);
      }
    }
    return result;
  }

  async log(input: AuditLogInput): Promise<void> {
    const {
      tenantId = null,
      actorUserId = null,
      actorType,
      action,
      targetType = null,
      targetId = null,
      metadata = null,
      ip = null,
      userAgent = null,
    } = input;

    const safeMetadata = metadata ? this.sanitizeMetadata(metadata) : null;

    await this.auditLogRepo.create({
      data: {
        tenantId,
        actorUserId,
        actorType,
        action,
        targetType,
        targetId,
        metadata: safeMetadata,
        ip,
        userAgent,
      },
    });
  }
}
