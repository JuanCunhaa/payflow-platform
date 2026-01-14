import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

type MockUser = {
  id: string;
  email: string;
  name: string | null;
  type: string;
  status: string;
  memberships: any[];
};

type MockRefreshToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: MockUser;
};

async function run() {
  const passwordService = new PasswordService();
  const users: MockUser[] = [];
  const refreshTokens: MockRefreshToken[] = [];

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
  };
  users.push(user);

  const prismaMock = {
    user: {
      findUnique: async (args: any) => {
        const whereEmail = args?.where?.email;
        return users.find((u) => u.email === whereEmail) || null;
      },
    },
    refreshToken: {
      create: async (args: any) => {
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
      findUnique: async (args: any) => {
        const id = args.where?.id;
        return refreshTokens.find((t) => t.id === id) || null;
      },
      update: async (args: any) => {
        const id = args.where?.id;
        const data = args.data || {};
        const token = refreshTokens.find((t) => t.id === id);
        if (!token) {
          throw new Error('Token not found');
        }
        Object.assign(token, data);
        return token;
      },
      updateMany: async (args: any) => {
        const id = args.where?.id;
        const matchRevokedAt = args.where?.revokedAt;
        const data = args.data || {};
        let count = 0;
        for (const t of refreshTokens) {
          if (t.id === id && t.revokedAt === matchRevokedAt) {
            Object.assign(t, data);
            count++;
          }
        }
        return { count };
      },
    },
  };

  let tokenCounter = 0;
  const jwtMock = {
    sign: (payload: any) => `jwt-${payload.sub}-${++tokenCounter}`,
  };

  const authService = new AuthService(prismaMock as any, jwtMock as any, passwordService);

  function createResponseMock() {
    return {
      cookies: {} as Record<string, { value: string; options: any }>,
      cookie(name: string, value: string, options: any) {
        this.cookies[name] = { value, options };
      },
    };
  }

  // ---- Login ----
  const resLogin = createResponseMock();
  const loginDto: any = { email, password: plainPassword };

  // Inject passwordHash into mocked user record
  (user as any).passwordHash = passwordHash;

  const loginResult = await authService.login(loginDto, undefined, resLogin as any);

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
    resRefresh as any,
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
  await authService.logout(secondCookieValue, resLogout as any);

  const clearedCookie = resLogout.cookies['payflow_refresh_token'];
  if (!clearedCookie || clearedCookie.options.maxAge !== 0) {
    throw new Error('logout() should clear refresh token cookie with maxAge 0');
  }

  const [secondTokenId] = secondCookieValue.split('.');
  const secondToken = refreshTokens.find((t) => t.id === secondTokenId);
  if (!secondToken || secondToken.revokedAt === null) {
    throw new Error('logout() should revoke current refresh token');
  }

  console.log('AuthService tests passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
