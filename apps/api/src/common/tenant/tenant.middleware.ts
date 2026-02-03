import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NextFunction, Request, Response } from 'express';

function stripPort(host?: string): string | undefined {
  if (!host) return host;
  const idx = host.indexOf(':');
  return idx >= 0 ? host.slice(0, idx) : host;
}

function extractFirstSubdomain(host?: string): string | undefined {
  if (!host) return undefined;
  const h = stripPort(host)?.toLowerCase();
  if (!h) return undefined;
  if (h === 'localhost') return undefined;
  const parts = h.split('.');
  if (parts.length < 3) return undefined; // e.g., localhost or example.com
  const sub = parts[0];
  if (!sub || sub === 'www') return undefined;
  return sub;
}

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    try {
      const tenantSlug = req.headers['x-tenant-slug'] as string | undefined;

      // If explicit header is provided (from frontend context), use it directly
      if (tenantSlug) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: tenantSlug },
          select: { id: true, slug: true, status: true },
        });
        if (tenant) {
          req.tenant = tenant;
          return; // Context resolved, skip subdomain check
        }
      }

      // Fallback to host-based resolution
      let host = req.headers['x-tenant-host'] as string | undefined;
      if (!host) {
        host = req.headers['x-forwarded-host'] as string | undefined;
      }
      if (!host) {
        host = req.headers['host'];
      }
      const subdomain = extractFirstSubdomain(host);
      if (subdomain) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug: subdomain },
          select: { id: true, slug: true, status: true }, // Select status too for consistency
        });
        if (tenant) {
          req.tenant = tenant;
        }
      }
    } catch (err) {
      this.logger.warn(`Tenant resolution error: ${String(err)}`);
    } finally {
      next();
    }
  }
}
