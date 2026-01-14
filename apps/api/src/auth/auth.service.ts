import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { Response } from 'express';
import { randomBytes, randomUUID } from 'crypto';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  userType: string;
  tenantId?: string;
  role?: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    userType: string;
    status?: string;
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  redirectHint?: string;
}

const REFRESH_TOKEN_COOKIE = 'payflow_refresh_token';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService
  ) {}

  async login(
    loginDto: LoginDto,
    tenantSlug: string | undefined,
    res: Response
  ): Promise<LoginResponse> {
    const email = loginDto.email.trim().toLowerCase();
    const { password } = loginDto;

    // Find user by email (case-insensitive due to CITEXT)
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login attempt failed: user not found for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login attempt failed: user ${email} is ${user.status}`);
      throw new UnauthorizedException('Account is not active');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: invalid password for ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // For PLATFORM users, no tenant required
    if (user.type === 'PLATFORM') {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        userType: user.type,
      };

      this.logger.log(`Platform user ${email} logged in successfully`);

      const accessToken = this.jwtService.sign(payload);
      await this.issueRefreshToken(user.id, res);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.type,
          status: user.status,
        },
        redirectHint: 'platform_dashboard',
      };
    }

    // For tenant users, find their membership
    let membership = user.memberships[0]; // Default to first membership

    // If a specific tenant is requested, find that membership
    if (tenantSlug) {
      const tenantMembership = user.memberships.find((m) => m.tenant.slug === tenantSlug);
      if (!tenantMembership) {
        this.logger.warn(
          `Login attempt failed: user ${email} has no membership in tenant ${tenantSlug}`
        );
        throw new UnauthorizedException('No access to this tenant');
      }
      membership = tenantMembership;
    }

    if (!membership) {
      this.logger.warn(`Login attempt failed: user ${email} has no tenant memberships`);
      throw new UnauthorizedException('No tenant membership found');
    }

    // Check if tenant is active
    if (membership.tenant.status !== 'ACTIVE') {
      this.logger.warn(
        `Login attempt failed: tenant ${membership.tenant.slug} is ${membership.tenant.status}`
      );
      throw new UnauthorizedException('Tenant is not active');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.type,
      tenantId: membership.tenantId,
      role: membership.role,
    };

    this.logger.log(
      `User ${email} logged in to tenant ${membership.tenant.slug} as ${membership.role}`
    );

    const accessToken = this.jwtService.sign(payload);
    await this.issueRefreshToken(user.id, res);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.type,
        status: user.status,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
      redirectHint: 'tenant_dashboard',
    };
  }

  async validateUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        status: true,
      },
    });
  }

  // Helper to access refresh token repository without relying on generated Prisma typings
  private get refreshTokenRepo() {
    return this.prisma.refreshToken;
  }

  private getRefreshCookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: REFRESH_TOKEN_TTL_MS,
    };
  }

  private async issueRefreshToken(
    userId: string,
    res: Response,
    previousTokenId?: string
  ): Promise<void> {
    const secret = randomBytes(32).toString('hex');
    const tokenHash = await this.passwordService.hash(secret);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    const id = randomUUID();

    await this.refreshTokenRepo.create({
      data: {
        id,
        userId,
        tokenHash,
        expiresAt,
      },
    });

    if (previousTokenId) {
      await this.refreshTokenRepo
        .update({
          where: { id: previousTokenId },
          data: { revokedAt: new Date() },
        })
        .catch(() => {
          // Ignore if token was already revoked/removed
        });
    }

    const cookieValue = `${id}.${secret}`;
    res.cookie(REFRESH_TOKEN_COOKIE, cookieValue, this.getRefreshCookieOptions());
  }

  async refreshSession(
    refreshCookie: string | undefined,
    tenantSlug: string | undefined,
    res: Response
  ): Promise<LoginResponse> {
    if (!refreshCookie) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const [id, secret] = refreshCookie.split('.');
    if (!id || !secret) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const token = await this.refreshTokenRepo.findUnique({
      where: { id },
      include: { user: { include: { memberships: { include: { tenant: true } } } } },
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValid = await this.passwordService.verify(secret, token.tokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = token.user;

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Determine tenant context similarly to login
    if (user.type === 'PLATFORM') {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        userType: user.type,
      };

      const accessToken = this.jwtService.sign(payload);
      await this.issueRefreshToken(user.id, res, token.id);

      return {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.type,
          status: user.status,
        },
        redirectHint: 'platform_dashboard',
      };
    }

    let membership = user.memberships[0];

    if (tenantSlug) {
      const tenantMembership = user.memberships.find((m) => m.tenant.slug === tenantSlug);
      if (!tenantMembership) {
        throw new UnauthorizedException('No access to this tenant');
      }
      membership = tenantMembership;
    }

    if (!membership) {
      throw new UnauthorizedException('No tenant membership found');
    }

    if (membership.tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is not active');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.type,
      tenantId: membership.tenantId,
      role: membership.role,
    };

    const accessToken = this.jwtService.sign(payload);
    await this.issueRefreshToken(user.id, res, token.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.type,
        status: user.status,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
      redirectHint: 'tenant_dashboard',
    };
  }

  async logout(refreshCookie: string | undefined, res: Response): Promise<void> {
    if (refreshCookie) {
      const [id] = refreshCookie.split('.');
      if (id) {
        await this.refreshTokenRepo
          .updateMany({
            where: { id, revokedAt: null },
            data: { revokedAt: new Date() },
          })
          .catch(() => {
            // Ignore errors during logout
          });
      }
    }

    res.cookie(REFRESH_TOKEN_COOKIE, '', {
      ...this.getRefreshCookieOptions(),
      maxAge: 0,
    });
  }
}
