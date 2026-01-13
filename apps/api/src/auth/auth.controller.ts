import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CustomThrottlerGuard } from '../common/guards/throttler.guard';
import { AuthService, LoginResponse } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Authenticates user and returns JWT token
   * Rate limited: 10 attempts per 5 minutes per IP to prevent brute-force attacks
   */
  @Post('login')
  @Public()
  @UseGuards(CustomThrottlerGuard)
  @Throttle({ short: { ttl: 5 * 60 * 1000, limit: 10 } })
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<LoginResponse> {
    // Get tenant from middleware if present (subdomain-based login)
    const tenant = (req as any).tenant;
    return this.authService.login(loginDto, tenant?.slug);
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
}
