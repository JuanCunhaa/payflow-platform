import { NextRequest, NextResponse } from 'next/server';
import { defaultLocale, locales } from '@payflow/shared';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if locale is already in pathname
  const pathnameHasLocale = locales.some((locale) =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Redirect to default locale if no locale in pathname
  if (pathname === '/' || !pathname.startsWith('/')) {
    return NextResponse.redirect(
      new URL(`/${defaultLocale}${pathname}`, request.url)
    );
  }

  // If pathname doesn't have locale, redirect to default locale
  return NextResponse.redirect(
    new URL(`/${defaultLocale}${pathname}`, request.url)
  );
}

export const config = {
  matcher: ['/((?!_next|api|public).*)'],
};
