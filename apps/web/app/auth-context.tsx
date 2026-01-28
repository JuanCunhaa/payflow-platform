'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from './i18n-context';
import { i18nKeys } from '@payflow/shared';
import { getApiBase } from './api-base';

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
  role?: string;
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
  isLoggingOut: boolean;
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  loginError: string | null;
  clearLoginError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_USER_KEY = 'payflow_auth_user';
const STORAGE_TOKEN_KEY = 'payflow_auth_access_token';

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
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const router = useRouter();
  const { t, locale } = useI18n();

  const refreshSession = useCallback(async (): Promise<{ ok: boolean; accessToken?: string }> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const parts = hostname.split('.');
        // Check for tenant subdomain (e.g., tenant.cobranex.xyz or tenant.localtest.me)
        if (hostname.endsWith('cobranex.xyz') && parts.length >= 3) {
          headers['X-Tenant-Slug'] = parts[0];
        } else if (hostname.includes('localtest.me') && parts.length >= 3) {
          headers['X-Tenant-Slug'] = parts[0];
        } else if (parts.length >= 3 && !hostname.endsWith('vercel.app')) {
          // Generic fallback for other 2-part TLDs if configured
          headers['X-Tenant-Slug'] = parts[0];
        }
      }

      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        headers,
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

      // Primeiro tenta restaurar sessГЈo da sessionStorage (caso de reload).
      if (typeof window !== 'undefined') {
        try {
          const storedUser = window.sessionStorage.getItem(STORAGE_USER_KEY);
          const storedToken = window.sessionStorage.getItem(STORAGE_TOKEN_KEY);
          if (storedUser && storedToken) {
            const parsedUser = JSON.parse(storedUser) as AuthUser;
            setUser(parsedUser);
            setAccessToken(storedToken);
            if (!cancelled) {
              setSessionLoading(false);
            }
            return;
          }
        } catch {
          // ignore parse errors and fall back to refresh
        }
      }

      const result = await refreshSession();
      if (!cancelled) {
        setSessionLoading(false);
        if (!result.ok) {
          setUser(null);
          setAccessToken(null);
        }
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
        const bypassHeaders: Record<string, string> = {};
        if (
          process.env.NODE_ENV !== 'production' ||
          process.env.NEXT_PUBLIC_BYPASS_RATE_LIMIT_FOR_TESTS === '1'
        ) {
          bypassHeaders['x-payflow-bypass-ratelimit'] = '1';
        }

        const res = await fetch(`${getApiBase()}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
            ...bypassHeaders,
          },
          credentials: 'include',
          body: JSON.stringify({ email, password }),
        });

        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // Ignore JSON parse errors; handled by status below
        }

        if (!res.ok) {
          const code = data?.code as string | undefined;

          let key: (typeof i18nKeys.login.error)[keyof typeof i18nKeys.login.error] =
            i18nKeys.login.error.generic;
          if (code === 'rate_limit_exceeded') {
            key = i18nKeys.login.error.rateLimit;
          }

          const msg = t ? t(key) : key;
          setLoginError(msg);

          // Surface error so callers can react (e.g. stop loading)
          throw new Error(code || 'login_failed');
        }

        const loginData = data as LoginResponse;
        const nextUser: AuthUser = { ...loginData.user, tenant: loginData.tenant };

        setUser(nextUser);
        setAccessToken(loginData.accessToken);

        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
            window.sessionStorage.setItem(STORAGE_TOKEN_KEY, loginData.accessToken);
          } catch {
            // ignore storage errors in dev/test
          }
        }

        const path = computeRedirectPath(nextUser);
        const base = locale || 'pt-BR';

        // Handle Tenant/Subdomain Redirection
        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const port = window.location.port ? `:${window.location.port}` : '';
          const parts = hostname.split('.');

          let currentSub = '';
          let baseDomain = hostname;

          // Assumes 2-part top-level domains like localtest.me, payflow.com
          // For localhost, parts.length is 1, so baseDomain=localhost, sub=''

          if (hostname.endsWith('cobranex.xyz')) {
            if (parts.length >= 3) {
              currentSub = parts[0];
              baseDomain = parts.slice(1).join('.');
            } else {
              currentSub = '';
              baseDomain = hostname;
            }
          } else if (hostname.endsWith('.vercel.app')) {
            // In Vercel free tier, we cannot easily use wildcards.
            // So we assume the current hostname IS the base domain for logic purposes,
            // unless we want to redirect to another vercel app (which is unlikely to be automatic).
            // HOWEVER, the user wants 'admin.payflow-platform-web.vercel.app' which is NOT standard Vercel behavior without custom domain.
            // Assuming user has set up wildcard or custom domains:

            // If the user REALLY has admin.payflow-platform-web.vercel.app
            // Then parts would be ['admin', 'payflow-platform-web', 'vercel', 'app']
            // length = 4.

            if (parts.length >= 4) {
              currentSub = parts[0];
              baseDomain = parts.slice(1).join('.');
            } else {
              // length 3: payflow-platform-web.vercel.app -> sub='', base='payflow...vercel.app'
              currentSub = '';
              baseDomain = hostname;
            }
          } else if (parts.length >= 3) {
            currentSub = parts[0];
            baseDomain = parts.slice(1).join('.');
          }

          let targetSub = '';
          if (nextUser.userType === 'PLATFORM') {
            targetSub = 'admin';
          } else if (nextUser.tenant?.slug) {
            targetSub = nextUser.tenant.slug;
          }

          // If target defined and different from current, full redirect
          if (targetSub && targetSub !== currentSub) {
            const protocol = window.location.protocol;
            const newHost = `${targetSub}.${baseDomain}${port}`;
            // Construct absolute URL
            const newUrl = `${protocol}//${newHost}/${base}${path}`;
            window.location.href = newUrl;
            return; // Stop execution (router.push not needed)
          }
        }

        router.push(`/${base}${path}`);
      } catch (err) {
        setLoginError((prev) => {
          if (prev) return prev;
          const fallback = t ? t(i18nKeys.login.error.connection) : 'login.error.connection';
          return fallback;
        });
        throw err;
      }
    },
    [locale, router, t]
  );

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }

    setUser(null);
    setAccessToken(null);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_USER_KEY);
        window.sessionStorage.removeItem(STORAGE_TOKEN_KEY);
      } catch {
        // ignore
      }
    }

    const base = locale || 'pt-BR';

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      // Check for local development environments
      if (hostname.includes('localhost') || hostname.includes('localtest.me')) {
        const parts = hostname.split('.');
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';

        // If subdomain exists (e.g. tenant.localtest.me), strip it
        let targetDomain = hostname;
        if (hostname.includes('localtest.me') && parts.length >= 3) {
          targetDomain = parts.slice(1).join('.');
        }

        window.location.href = `${protocol}//${targetDomain}${port}/${base}`;
      } else {
        // Production: Force redirect to main domain
        window.location.href = `https://cobranex.xyz/${base}`;
      }
    } else {
      router.push(`/${base}`);
    }

    setIsLoggingOut(false);
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

        if (typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          const parts = hostname.split('.');
          // Check for tenant subdomain (e.g., tenant.cobranex.xyz or tenant.localtest.me)
          let tenantSlug: string | undefined;

          if (hostname.endsWith('cobranex.xyz') && parts.length >= 3) {
            tenantSlug = parts[0];
          } else if (hostname.includes('localtest.me') && parts.length >= 3) {
            tenantSlug = parts[0];
          } else if (parts.length >= 3 && !hostname.endsWith('vercel.app')) {
            // Generic fallback for other 2-part TLDs if configured
            tenantSlug = parts[0];
          }

          if (tenantSlug) {
            headers.set('X-Tenant-Slug', tenantSlug);
          }
        }

        return fetch(`${getApiBase()}${path}`, {
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
    [accessToken, logout, refreshSession]
  );

  const clearLoginError = useCallback(() => {
    setLoginError(null);
  }, []);

  const value: AuthContextValue = {
    user,
    accessToken,
    sessionLoading,
    isLoggingOut,
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
