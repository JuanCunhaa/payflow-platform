export type UUID = string;

export { i18nKeys, defaultLocale, locales, type Locale } from './i18n/keys';

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
