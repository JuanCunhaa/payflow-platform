import { Body, Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * POST /auth/login
   * Authenticates user and returns JWT token
   * Rate limited: 10 attempts per 5 minutes per IP to prevent brute-force attacks
   */
  @Post('login')
  @Public()
  @UseGuards(CustomThrottlerGuard)
  @Throttle({ short: { ttl: 5 * 60 * 1000, limit: 10 } })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponse> {
    const tenant = (req as any).tenant;
    const normalizedEmail = loginDto.email.trim().toLowerCase();
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || undefined;
    const userAgent = (req.headers['user-agent'] as string | undefined) || undefined;

    try {
      const result = await this.authService.login(loginDto, tenant?.slug, res);

      await this.auditService.log({
        tenantId: result.tenant?.id ?? null,
        actorUserId: result.user.id,
        actorType: 'USER',
        action: 'auth.login.success',
        targetType: 'user',
        targetId: result.user.id,
        metadata: {
          email: result.user.email,
          userType: result.user.userType,
          tenantSlug: result.tenant?.slug ?? null,
        },
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      });

      return result;
    } catch (err) {
      await this.auditService.log({
        tenantId: tenant?.id ?? null,
        actorUserId: null,
        actorType: 'USER',
        action: 'auth.login.failure',
        targetType: 'user',
        targetId: null,
        metadata: {
          email: normalizedEmail,
          reason: 'login_failed',
        },
        ip: ip ?? null,
        userAgent: userAgent ?? null,
      });
      throw err;
    }
  }

  /**
   * POST /auth/refresh
   * Uses httpOnly refresh token cookie to issue a new access token
   */
  @Post('refresh')
  @Public()
  @UseGuards(CustomThrottlerGuard)
  @Throttle({ short: { ttl: 5 * 60 * 1000, limit: 10 } })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<LoginResponse> {
    const tenant = (req as any).tenant;
    const refreshCookie = req.cookies?.payflow_refresh_token as string | undefined;
    return this.authService.refreshSession(refreshCookie, tenant?.slug, res);
  }

  /**
   * GET /auth/me
   * Returns current authenticated user info
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    return {
      user,
    };
  }

  /**
   * POST /auth/logout
   * Revokes current refresh token and clears cookie
   */
  @Post('logout')
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshCookie = req.cookies?.payflow_refresh_token as string | undefined;
    await this.authService.logout(refreshCookie, res);

    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || req.ip || undefined;
    const userAgent = (req.headers['user-agent'] as string | undefined) || undefined;

    await this.auditService.log({
      tenantId: (req as any).tenant?.id ?? null,
      actorUserId: null,
      actorType: 'PUBLIC',
      action: 'auth.logout',
      targetType: 'user',
      targetId: null,
      metadata: {
        hadRefreshCookie: Boolean(refreshCookie),
      },
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });

    return { success: true };
  }
}
