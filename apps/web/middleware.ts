import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@payflow/shared';

function stripPort(host?: string) {
  if (!host) return host;
  const i = host.indexOf(':');
  return i >= 0 ? host.slice(0, i) : host;
}

function extractFirstSubdomain(host?: string): { sub?: string; domain?: string } {
  if (!host) return {};
  const h = stripPort(host)?.toLowerCase();
  if (!h) return {};
  const parts = h.split('.');
  if (parts.length < 3) return {}; // no subdomain
  const [sub, ...rest] = parts;
  if (!sub || sub === 'www') return {};
  return { sub, domain: rest.join('.') };
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if locale is already in pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Allow tenant-not-found to bypass locale redirects to avoid loops
  if (pathname === '/tenant-not-found' || pathname.endsWith('/tenant-not-found')) {
    return NextResponse.next();
  }

  // If locale already present, proceed (we might still validate tenant below)
  if (pathnameHasLocale) {
    return maybeValidateTenant(request);
  }

  // Check for NEXT_LOCALE cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const preferredLocale = locales.includes(localeCookie as any) ? localeCookie : defaultLocale;

  // Redirect to preferred locale if no locale in pathname
  if (pathname === '/' || !pathname.startsWith('/')) {
    return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}`, request.url));
  }

  // If pathname doesn't have locale, redirect to preferred locale
  return NextResponse.redirect(new URL(`/${preferredLocale}${pathname}`, request.url));
}

async function maybeValidateTenant(request: NextRequest) {
  // Bypass on tenant-not-found to avoid loops
  const path = request.nextUrl.pathname;
  if (path.includes('/tenant-not-found')) return NextResponse.next();

  const host = request.headers.get('host') || undefined;
  const { sub, domain } = extractFirstSubdomain(host);

  const parts = path.split('/');
  const maybeLocale = parts.length > 1 ? parts[1] : '';
  const locale = locales.includes(maybeLocale as any) ? maybeLocale : defaultLocale;
  const isPlatformPath = parts.length > 2 && parts[2] === 'p';

  // Host-based routing for platform (/p) paths
  if (isPlatformPath) {
    // Allow /p only on admin.* host
    if (sub === 'admin') {
      // Platform host: do not validate tenant
      return NextResponse.next();
    }

    // On tenant or root hosts, block /p and send user back to locale root
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }

  // Admin host on non-/p routes: skip tenant validation
  if (sub === 'admin') {
    return NextResponse.next();
  }

  // Only validate tenant in dev for localtest.me/lvh.me
  if (!sub || !domain) return NextResponse.next();
  if (!domain.endsWith('localtest.me') && !domain.endsWith('lvh.me')) {
    return NextResponse.next();
  }

  // Validate against API by calling /tenant/ping with appropriate Host header
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    const apiUrl = `${apiBase}/tenant/ping`;
    const apiHost = `${sub}.${domain}:3333`;
    const res = await fetch(apiUrl, {
      headers: { Host: apiHost },
      // short timeout via next fetch cache is not available; rely on fast local
    });
    if (res.status === 404) {
      // Try to detect our standardized error code
      let code = '';
      try {
        const data = await res.json();
        code = data?.code || '';
      } catch { }
      if (code === 'tenant_not_found') {
        const url = request.nextUrl.clone();
        // Preserve current locale if present; otherwise use default
        const parts = path.split('/');
        const maybeLocale = parts.length > 1 ? parts[1] : '';
        const locale = locales.includes(maybeLocale as any) ? maybeLocale : defaultLocale;
        url.pathname = `/${locale}/tenant-not-found`;
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // If API not reachable, don't block navigation in dev
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|public).*)'],
};
