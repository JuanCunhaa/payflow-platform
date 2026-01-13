'use client';

import React, { createContext, useContext } from 'react';
import { Locale } from '@payflow/shared';
import { getNestedValue } from '@/lib/i18n';

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  dict: Record<string, any>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Record<string, any>;
  children: React.ReactNode;
}) {
  const t = (key: string) => getNestedValue(dict, key);

  return <I18nContext.Provider value={{ locale, t, dict }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
