export const i18nKeys = {
  nav: {
    home: 'nav.home',
    login: 'nav.login',
    logout: 'nav.logout',
  },
  landing: {
    title: 'landing.title',
    subtitle: 'landing.subtitle',
    cta: 'landing.cta',
    description: 'landing.description',
  },
  login: {
    title: 'login.title',
    email: 'login.email',
    password: 'login.password',
    submit: 'login.submit',
    noAccount: 'login.noAccount',
    signup: 'login.signup',
  },
  common: {
    ok: 'common.ok',
    cancel: 'common.cancel',
    error: 'common.error',
    loading: 'common.loading',
  },
} as const;

export type Locale = 'pt-BR' | 'en-US';
export const defaultLocale: Locale = 'pt-BR';
export const locales: Locale[] = ['pt-BR', 'en-US'];
