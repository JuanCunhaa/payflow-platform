'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './i18n-context';
import { i18nKeys } from '@payflow/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

type AuthTenant = {
  id: string;
  name: string;
  slug: string;
};

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  userType: string;
  status?: string;
  tenant?: AuthTenant;
};

type LoginResponse = {
  accessToken: string;
  user: AuthUser;
  tenant?: AuthTenant;
  redirectHint?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  sessionLoading: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  loginError: string | null;
  clearLoginError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function computeRedirectPath(user: AuthUser | null): string {
  if (!user) return '/';

  if (user.userType === 'PLATFORM') {
    return '/p';
  }

  if (user.userType === 'STAFF') {
    return '/s';
  }

  if (user.userType === 'GUARDIAN') {
    if (user.status === 'ACTIVE') {
      return '/g';
    }
    return '/pending-approval';
  }

  return '/';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  const router = useRouter();
  const { t, locale } = useI18n();

  const refreshSession = useCallback(async (): Promise<{ ok: boolean; accessToken?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        setAccessToken(null);
        return { ok: false };
      }

      const data = (await res.json()) as LoginResponse;
      const nextUser: AuthUser = { ...data.user, tenant: data.tenant };
      setUser(nextUser);
      setAccessToken(data.accessToken);

      return { ok: true, accessToken: data.accessToken };
    } catch {
      setUser(null);
      setAccessToken(null);
      return { ok: false };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionLoading(true);
      const result = await refreshSession();
      if (!cancelled && !result.ok) {
        setSessionLoading(false);
      } else if (!cancelled) {
        setSessionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string, tenantSlug?: string) => {
      setLoginError(null);

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        const data = (await res.json()) as any;

        if (!res.ok) {
          const msg = t ? t(i18nKeys.login.error.generic) : 'login.error.generic';
          setLoginError(msg);
          throw new Error(msg);
        }

        const loginData = data as LoginResponse;
        const nextUser: AuthUser = { ...loginData.user, tenant: loginData.tenant };

        setUser(nextUser);
        setAccessToken(loginData.accessToken);

        const path = computeRedirectPath(nextUser);
        const base = locale || 'pt-BR';
        router.push(`/${base}${path}`);
      } catch (err) {
        if (!loginError) {
          const fallback = t ? t(i18nKeys.login.error.connection) : 'login.error.connection';
          setLoginError(fallback);
        }
        throw err;
      }
    },
    [locale, loginError, router, t],
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }

    setUser(null);
    setAccessToken(null);

    const base = locale || 'pt-BR';
    router.push(`/${base}`);
  }, [locale, router]);

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const doFetch = async (token: string | null): Promise<Response> => {
        const headers = new Headers(init.headers as HeadersInit | undefined);
        if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
          headers.set('Content-Type', 'application/json');
        }
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        return fetch(`${API_BASE}${path}`, {
          ...init,
          headers,
          credentials: 'include',
        });
      };

      let res = await doFetch(accessToken);
      if (res.status !== 401) {
        return res;
      }

      const result = await refreshSession();
      if (!result.ok) {
        await logout();
        return res;
      }

      res = await doFetch(result.accessToken ?? null);
      return res;
    },
    [accessToken, logout, refreshSession],
  );

  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    sessionLoading,
    login,
    logout,
    apiFetch,
    loginError,
    clearLoginError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
