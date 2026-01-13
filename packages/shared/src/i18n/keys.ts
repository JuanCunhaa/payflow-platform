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
    error: {
      generic: 'login.error.generic',
      connection: 'login.error.connection',
    },
    debug: {
      title: 'login.debug.title',
      emailLabel: 'login.debug.emailLabel',
      passwordLabel: 'login.debug.passwordLabel',
    },
  },
  common: {
    ok: 'common.ok',
    cancel: 'common.cancel',
    error: 'common.error',
    loading: 'common.loading',
    language: {
      english: 'common.language.english',
      portuguese: 'common.language.portuguese',
    },
  },
  tenant: {
    notFound: {
      title: 'tenant.notFound.title',
      description: 'tenant.notFound.description',
      extra: 'tenant.notFound.extra',
    },
  },
  dashboard: {
    title: 'dashboard.title',
    welcome: 'dashboard.welcome',
    userTypeLabel: 'dashboard.userTypeLabel',
    emailLabel: 'dashboard.emailLabel',
    tenantLabel: 'dashboard.tenantLabel',
    platformTenantFallback: 'dashboard.platformTenantFallback',
    backToHome: 'dashboard.backToHome',
  },
} as const;

export type Locale = 'pt-BR' | 'en-US';
export const defaultLocale: Locale = 'pt-BR';
export const locales: Locale[] = ['pt-BR', 'en-US'];
