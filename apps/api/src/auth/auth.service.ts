import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { Response } from 'express';
import { randomBytes, randomUUID } from 'crypto';
import { EmailService } from '../notifications/email.service';

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
    role?: string;
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
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService
  ) { }

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
          role: undefined,
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
        role: membership.role,
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
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
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
          role: undefined,
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
        role: membership.role,
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

  /**
   * Creates a password reset token for the given email if a user exists.
   * Always succeeds with no indication whether the email is registered.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      // Keep behaviour generic: do nothing, but do not fail.
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      // Do not reveal that the email is not registered.
      this.logger.log(`Password reset requested for non-existent email ${normalizedEmail}`);
      return;
    }

    const id = randomUUID();
    const secret = randomBytes(32).toString('hex');
    const tokenHash = await this.passwordService.hash(secret);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
    const createdAt = new Date();

    // Store hashed token using raw SQL to keep schema dependency minimal.
    await this.prisma.$executeRaw`
      INSERT INTO "password_reset_tokens" ("id", "user_id", "token_hash", "expires_at", "created_at")
      VALUES (${id}, ${user.id}, ${tokenHash}, ${expiresAt}, ${createdAt})
    `;

    const fullToken = `${id}.${secret}`;

    // Simulated email integration
    await this.emailService.sendPasswordResetEmail(user.email, fullToken);

    this.logger.log(`Password reset token created for user ${user.email}`);
  }

  /**
   * Resets password using a reset token and new password.
   * Applies password strength validation and revokes existing refresh tokens.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const trimmedToken = token?.trim();
    if (!trimmedToken) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Invalid password reset token',
      });
    }

    // Validate new password strength first.
    this.passwordService.validateStrength(newPassword);

    const [id, secret] = trimmedToken.split('.');
    if (!id || !secret) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Invalid password reset token',
      });
    }

    type PasswordResetTokenRow = {
      id: string;
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      usedAt: Date | null;
    };

    const rows = await this.prisma.$queryRaw<PasswordResetTokenRow[]>`
      SELECT
        id,
        user_id   AS "userId",
        token_hash AS "tokenHash",
        expires_at AS "expiresAt",
        used_at    AS "usedAt"
      FROM "password_reset_tokens"
      WHERE id = ${id}
    `;

    const record = rows[0];

    if (!record) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Invalid or unknown password reset token',
      });
    }

    if (record.usedAt) {
      throw new BadRequestException({
        code: 'reset_token_used',
        message: 'Password reset token has already been used',
      });
    }

    const now = new Date();
    if (record.expiresAt < now) {
      throw new BadRequestException({
        code: 'reset_token_expired',
        message: 'Password reset token has expired',
      });
    }

    const isValidSecret = await this.passwordService.verify(secret, record.tokenHash);
    if (!isValidSecret) {
      throw new BadRequestException({
        code: 'invalid_token',
        message: 'Invalid password reset token',
      });
    }

    const newHash = await this.passwordService.hash(newPassword);

    // Update password, mark token as used and revoke existing refresh tokens.
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash },
    });

    await this.prisma.$executeRaw`
      UPDATE "password_reset_tokens"
      SET "used_at" = ${now}
      WHERE "id" = ${record.id}
    `;

    await this.refreshTokenRepo.updateMany({
      where: {
        userId: record.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    this.logger.log(`Password reset completed for user ${record.userId}`);
  }
}
