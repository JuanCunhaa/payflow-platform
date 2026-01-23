import { Locale, locales } from '@payflow/shared';
import { getDictionary } from '@/lib/i18n';
import { I18nProvider } from '../i18n-context';
import { headers } from 'next/headers';
import { TenantProvider } from '../tenant-context';
import { AuthProvider } from '../auth-context';

function stripPort(host?: string | null) {
  if (!host) return null;
  const i = host.indexOf(':');
  return i >= 0 ? host.slice(0, i) : host;
}
function extractFirstSubdomain(host?: string | null): string | null {
  if (!host) return null;
  const h = stripPort(host)?.toLowerCase();
  if (!h) return null;
  const parts = h.split('.');
  if (parts.length < 3) return null;
  const [sub] = parts;
  if (!sub || sub === 'www') return null;
  return sub;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: { locale: Locale } }) {
  const dict = await getDictionary(params.locale);
  return {
    title: dict.landing.title,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  const dict = await getDictionary(params.locale);
  const host = headers().get('host');
  const tenantSlug = extractFirstSubdomain(host);

  return (
    <TenantProvider slug={tenantSlug}>
      <I18nProvider locale={params.locale} dict={dict}>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </TenantProvider>
  );
}
