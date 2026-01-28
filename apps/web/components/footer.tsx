'use client';

import Link from 'next/link';
import { useI18n } from '@/app/i18n-context';
import { i18nKeys } from '@payflow/shared';

export function Footer() {
  const { t, locale } = useI18n();

  return (
    <footer className="border-t bg-muted/40 py-12">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            &copy; {new Date().getFullYear()} Cobra Nex. {t(i18nKeys.footer.copyright)}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href={`/${locale}/terms`} className="hover:underline">
            {t(i18nKeys.footer.terms)}
          </Link>
          <Link href={`/${locale}/privacy`} className="hover:underline">
            {t(i18nKeys.footer.privacy)}
          </Link>
          <Link href={`/${locale}/support`} className="hover:underline">
            {t(i18nKeys.footer.support)}
          </Link>
        </div>
      </div>
    </footer>
  );
}
