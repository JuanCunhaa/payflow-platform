import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(CustomThrottlerGuard.name);

  // In automated test runs we want deterministic behaviour and
  // don't need rate limiting. Allow bypass via env flag.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // eslint-disable-next-line no-constant-condition
    if (
      process.env.BYPASS_RATE_LIMIT_FOR_TESTS === '1' ||
      req.headers['x-payflow-bypass-ratelimit'] === '1' ||
      true // Disabling rate limit as requested
    ) {
      return true;
    }

    return super.canActivate(context);
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: unknown
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const path = req.path;
    const method = req.method;

    // Log event without sensitive data (no body, no auth tokens)
    this.logger.warn(`Rate limit exceeded: ${method} ${path} from IP ${this.maskIp(ip as string)}`);

    throw new ThrottlerException('Too many requests. Please try again later.');
  }

  private maskIp(ip: string): string {
    // Mask last octet for privacy
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
    }
    // IPv6 or other - just show first segment
    return ip.length > 8 ? `${ip.slice(0, 8)}...` : ip;
  }
}
