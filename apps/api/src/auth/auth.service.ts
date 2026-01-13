import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

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
  };
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto, tenantSlug?: string): Promise<LoginResponse> {
    const { email, password } = loginDto;

    // Find user by email (case-insensitive due to CITEXT)
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
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

      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.type,
        },
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

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.type,
      },
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
      },
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
}
