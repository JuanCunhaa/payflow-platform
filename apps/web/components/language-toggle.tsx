'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/app/i18n-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();

  const handleLanguageChange = (newLocale: string) => {
    // Set cookie for middleware
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Calculate new path
    // pathname usually starts with /locale, e.g. /pt-BR/dashboard
    if (!pathname) return;

    const segments = pathname.split('/');
    // segments[1] is the locale
    if (segments.length >= 2) {
      segments[1] = newLocale;
      const newPath = segments.join('/');
      router.replace(newPath);
    } else {
      // Fallback if path is weird
      router.replace(`/${newLocale}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t('common.language.switch')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('pt-BR')}
          disabled={locale === 'pt-BR'}
        >
          Português (Brasil)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en-US')}
          disabled={locale === 'en-US'}
        >
          English (US)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
