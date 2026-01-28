'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { ModeToggle } from './mode-toggle';
import { LanguageToggle } from './language-toggle';
import { useI18n } from '@/app/i18n-context';
import { i18nKeys } from '@payflow/shared';

export function Header() {
  const { t, locale } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">Cobra Nex</span>
        </Link>
        <nav className="flex items-center space-x-4">
          <LanguageToggle />
          <ModeToggle />
          <Link href={`/${locale}/login`}>
            <Button variant="ghost">{t(i18nKeys.landing.buttons.login)}</Button>
          </Link>
          <Link href={`/${locale}/register/guardian`}>
            <Button>{t(i18nKeys.landing.buttons.guardian)}</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
