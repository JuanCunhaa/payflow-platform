"use client";
import React, { createContext, useContext, useMemo } from 'react';
import { en } from './translations/en';
import { pt } from './translations/pt';

export type Locale = 'en' | 'pt';

const dictionaries = { en, pt } as const;

type Dict = Record<string, any>;

const I18nContext = createContext<{ t: (key: string) => string; locale: Locale }>({
  t: (key) => key,
  locale: 'pt',
});

export function I18nProvider({ locale = 'pt', children }: { locale?: Locale; children: React.ReactNode }) {
  const dict: Dict = dictionaries[locale] ?? en;
  const t = useMemo(() => {
    return (key: string) => {
      const parts = key.split('.');
      let node: any = dict;
      for (const p of parts) {
        node = node?.[p];
        if (node === undefined) return key;
      }
      return typeof node === 'string' ? node : key;
    };
  }, [dict]);

  return <I18nContext.Provider value={{ t, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
