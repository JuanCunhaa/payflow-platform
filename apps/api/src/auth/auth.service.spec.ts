import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

type MockUser = {
  id: string;
  email: string;
  name: string | null;
  type: string;
  status: string;
  memberships: unknown[];
  passwordHash: string;
};

type MockRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: MockUser;
};

type MockResponse = {
  cookies: Record<string, { value: string; options: Record<string, unknown> }>;
  cookie(name: string, value: string, options: Record<string, unknown>): void;
};

async function run() {
  const passwordService = new PasswordService();
  const users: MockUser[] = [];
  const refreshTokens: MockRefreshToken[] = [];
  const passwordResetTokens: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
    createdAt: Date;
  }[] = [];
  const emailEvents: { recipient: string; token: string }[] = [];

  const email = 'user@example.com';
  const plainPassword = 'Admin@12345';
  const passwordHash = await passwordService.hash(plainPassword);

  const user: MockUser = {
    id: 'user-1',
    email: email.toLowerCase(),
    name: 'Test User',
    type: 'PLATFORM',
    status: 'ACTIVE',
    memberships: [],
    passwordHash,
  };
  users.push(user);

  const prismaMock = {
    user: {
      findUnique: async (args: { where?: { email?: string } }) => {
        const whereEmail = args.where?.email;
        return users.find((u) => u.email === whereEmail) || null;
      },
      update: async (args: { where: { id: string }; data: Partial<MockUser> }) => {
        const { where, data } = args;
        const { id } = where;
        const existing = users.find((u) => u.id === id);
        if (!existing) {
          throw new Error('User not found');
        }
        Object.assign(existing, data);
        return existing;
      },
    },
    refreshToken: {
      create: async (args: { data: Omit<MockRefreshToken, 'revokedAt' | 'user'> }) => {
        const data = args.data;
        const token: MockRefreshToken = {
          id: data.id,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          user,
        };
        refreshTokens.push(token);
        return token;
      },
      findUnique: async (args: { where: { id: string } }) => {
        const id = args.where.id;
        return refreshTokens.find((t) => t.id === id) || null;
      },
      update: async (args: { where: { id: string }; data: Partial<MockRefreshToken> }) => {
        const id = args.where.id;
        const data = args.data ?? {};
        const token = refreshTokens.find((t) => t.id === id);
        if (!token) {
          throw new Error('Token not found');
        }
        Object.assign(token, data);
        return token;
      },
      updateMany: async (args: {
        where: { id?: string; userId?: string; revokedAt?: Date | null };
        data: Partial<MockRefreshToken>;
      }) => {
        const { id, userId, revokedAt } = args.where;
        const data = args.data ?? {};
        let count = 0;
        for (const t of refreshTokens) {
          const idMatches = id ? t.id === id : true;
          const userMatches = userId ? t.userId === userId : true;
          const revokedMatches =
            typeof revokedAt === 'undefined' ? true : t.revokedAt === revokedAt;
          if (idMatches && userMatches && revokedMatches) {
            Object.assign(t, data);
            count++;
          }
        }
        return { count };
      },
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join(' ');
      if (sql.includes('INSERT INTO "password_reset_tokens"')) {
        const [id, userId, tokenHash, expiresAt, createdAt] = values as [
          string,
          string,
          string,
          Date,
          Date,
        ];
        passwordResetTokens.push({
          id,
          userId,
          tokenHash,
          expiresAt,
          usedAt: null,
          createdAt,
        });
        return 1;
      }
      if (sql.includes('UPDATE "password_reset_tokens"')) {
        const [usedAt, id] = values as [Date, string];
        const record = passwordResetTokens.find((t) => t.id === id);
        if (record) {
          record.usedAt = usedAt;
        }
        return 1;
      }
      throw new Error(`Unsupported $executeRaw SQL in test: ${sql}`);
    },
    $queryRaw: async <T = unknown>(
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<T> => {
      const sql = strings.join(' ');
      if (sql.includes('FROM "password_reset_tokens"')) {
        const [id] = values as [string];
        const record = passwordResetTokens.find((t) => t.id === id);
        if (!record) {
          return [] as T;
        }
        const row = {
          id: record.id,
          userId: record.userId,
          tokenHash: record.tokenHash,
          expiresAt: record.expiresAt,
          usedAt: record.usedAt,
        };
        return [row] as unknown as T;
      }
      throw new Error(`Unsupported $queryRaw SQL in test: ${sql}`);
    },
  };

  const emailServiceMock = {
    async sendPasswordResetEmail(recipient: string, token: string) {
      emailEvents.push({ recipient, token });
    },
  };

  let tokenCounter = 0;
  const jwtMock = {
    sign: (payload: { sub: string }) => `jwt-${payload.sub}-${++tokenCounter}`,
  } as unknown as JwtService;

  const authService = new AuthService(
    prismaMock as unknown as PrismaService,
    jwtMock,
    passwordService,
    emailServiceMock as unknown as any
  );

  function createResponseMock(): MockResponse {
    return {
      cookies: {},
      cookie(name: string, value: string, options: Record<string, unknown>) {
        this.cookies[name] = { value, options };
      },
    };
  }

  // ---- Login ----
  const resLogin = createResponseMock();
  const loginDto: { email: string; password: string } = { email, password: plainPassword };

  const loginResult = await authService.login(
    loginDto,
    undefined,
    resLogin as unknown as unknown as import('express').Response
  );

  if (!loginResult.accessToken.startsWith('jwt-')) {
    throw new Error('login() did not return a valid access token');
  }
  if (!loginResult.user || loginResult.user.id !== user.id) {
    throw new Error('login() did not return correct user');
  }
  if (!resLogin.cookies['payflow_refresh_token']) {
    throw new Error('login() did not set refresh token cookie');
  }
  if (refreshTokens.length < 1) {
    throw new Error('login() should create at least one refresh token');
  }

  const firstToken = refreshTokens[0];
  if (firstToken.revokedAt !== null) {
    throw new Error('Newly created refresh token should not be revoked');
  }

  // ---- Refresh ----
  const refreshCookieValue = resLogin.cookies['payflow_refresh_token'].value;
  const resRefresh = createResponseMock();

  const refreshResult = await authService.refreshSession(
    refreshCookieValue,
    undefined,
    resRefresh as unknown as import('express').Response
  );

  if (!refreshResult.accessToken.startsWith('jwt-')) {
    throw new Error('refreshSession() did not return a valid access token');
  }
  if (refreshResult.accessToken === loginResult.accessToken) {
    throw new Error('refreshSession() should issue a new access token');
  }
  if (refreshTokens.length < 2) {
    throw new Error('refreshSession() should create a new refresh token');
  }
  if (firstToken.revokedAt === null) {
    throw new Error('refreshSession() should revoke previous refresh token');
  }

  const secondCookieValue = resRefresh.cookies['payflow_refresh_token']?.value;
  if (!secondCookieValue) {
    throw new Error('refreshSession() did not set a new refresh token cookie');
  }

  // ---- Logout ----
  const resLogout = createResponseMock();
  await authService.logout(secondCookieValue, resLogout as unknown as import('express').Response);

  const clearedCookie = resLogout.cookies['payflow_refresh_token'];
  if (!clearedCookie || clearedCookie.options.maxAge !== 0) {
    throw new Error('logout() should clear refresh token cookie with maxAge 0');
  }

  const [secondTokenId] = secondCookieValue.split('.');
  const secondToken = refreshTokens.find((t) => t.id === secondTokenId);
  if (!secondToken || secondToken.revokedAt === null) {
    throw new Error('logout() should revoke current refresh token');
  }

  // ---- Prepare an active refresh token for reset tests ----
  const resLogin2 = createResponseMock();
  await authService.login(loginDto, undefined, resLogin2 as unknown as import('express').Response);

  const activeBeforeReset = refreshTokens.filter(
    (t) => t.userId === user.id && t.revokedAt === null
  );
  if (activeBeforeReset.length < 1) {
    throw new Error('Second login should create an active refresh token');
  }

  // ---- Password reset: request ----
  await authService.requestPasswordReset(email);

  if (passwordResetTokens.length !== 1) {
    throw new Error('requestPasswordReset() should create exactly one reset token');
  }
  if (emailEvents.length !== 1) {
    throw new Error('requestPasswordReset() should send one reset email');
  }

  const resetTokenValue = emailEvents[0].token;
  const resetRecord = passwordResetTokens[0];

  // ---- Password reset: invalid token ----
  try {
    await authService.resetPassword('invalid-token', 'NewAdmin@123');
    throw new Error('resetPassword() should reject an invalid token');
  } catch {
    // expected
  }

  // ---- Password reset: expired token ----
  resetRecord.expiresAt = new Date(Date.now() - 60_000);
  try {
    await authService.resetPassword(resetTokenValue, 'NewAdmin@123');
    throw new Error('resetPassword() should reject an expired token');
  } catch {
    // expected
  }

  // ---- Password reset: token already used ----
  resetRecord.expiresAt = new Date(Date.now() + 60_000);
  resetRecord.usedAt = new Date();
  try {
    await authService.resetPassword(resetTokenValue, 'NewAdmin@123');
    throw new Error('resetPassword() should reject a used token');
  } catch {
    // expected
  }

  // ---- Password reset: success path ----
  passwordResetTokens.length = 0;
  emailEvents.length = 0;

  await authService.requestPasswordReset(email);

  const freshTokenValue = emailEvents[0].token;
  const freshRecord = passwordResetTokens[0];

  freshRecord.expiresAt = new Date(Date.now() + 60_000);
  freshRecord.usedAt = null;

  await authService.resetPassword(freshTokenValue, 'NewStrongPass1');

  if (!freshRecord.usedAt) {
    throw new Error('resetPassword() should mark token as used');
  }

  const passwordUpdated = await passwordService.verify('NewStrongPass1', user.passwordHash);
  if (!passwordUpdated) {
    throw new Error('resetPassword() should update the user password hash');
  }

  const activeAfterReset = refreshTokens.filter(
    (t) => t.userId === user.id && t.revokedAt === null
  );
  if (activeAfterReset.length > 0) {
    throw new Error('resetPassword() should revoke existing refresh tokens');
  }

  console.log('AuthService tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
