import { Locale, locales } from '@payflow/shared';
import { getDictionary } from '@/lib/i18n';
import { I18nProvider } from '../i18n-context';

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

  return (
    <html lang={params.locale === 'pt-BR' ? 'pt' : 'en'}>
      <body>
        <I18nProvider locale={params.locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
