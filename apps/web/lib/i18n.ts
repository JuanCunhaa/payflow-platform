import { Locale } from '@payflow/shared';

async function loadMessages(locale: Locale) {
  if (locale === 'pt-BR') {
    return import('../messages/pt-BR.json').then((m) => m.default);
  }
  if (locale === 'en-US') {
    return import('../messages/en-US.json').then((m) => m.default);
  }
  throw new Error(`Unknown locale: ${locale}`);
}

// Cache for performance
const cache: Record<Locale, Record<string, any> | null> = {
  'pt-BR': null,
  'en-US': null,
};

export async function getDictionary(locale: Locale) {
  if (!cache[locale]) {
    cache[locale] = await loadMessages(locale);
  }
  return cache[locale]!;
}

export function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) return path;
  }

  return typeof result === 'string' ? result : path;
}
