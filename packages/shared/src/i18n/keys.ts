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
    problem: {
      title: 'landing.problem.title',
      spreadsheets: 'landing.problem.spreadsheets',
      whatsapp: 'landing.problem.whatsapp',
      receipts: 'landing.problem.receipts',
    },
    solution: {
      title: 'landing.solution.title',
      events: 'landing.solution.events',
      tuitions: 'landing.solution.tuitions',
      oneOff: 'landing.solution.oneOff',
      communication: 'landing.solution.communication',
      finance: 'landing.solution.finance',
    },
    proof: {
      title: 'landing.proof.title',
      subtitle: 'landing.proof.subtitle',
    },
    finalCta: {
      title: 'landing.finalCta.title',
      subtitle: 'landing.finalCta.subtitle',
    },
    buttons: {
      login: 'landing.buttons.login',
      guardian: 'landing.buttons.guardian',
      demo: 'landing.buttons.demo',
    },
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
  auth: {
    pendingApproval: {
      title: 'auth.pendingApproval.title',
      description: 'auth.pendingApproval.description',
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
  requestDemo: {
    title: 'requestDemo.title',
    description: 'requestDemo.description',
    form: {
      responsibleName: 'requestDemo.form.responsibleName',
      schoolName: 'requestDemo.form.schoolName',
      email: 'requestDemo.form.email',
      phone: 'requestDemo.form.phone',
      submit: 'requestDemo.form.submit',
    },
    success: {
      title: 'requestDemo.success.title',
      description: 'requestDemo.success.description',
    },
    error: {
      validation: 'requestDemo.error.validation',
      generic: 'requestDemo.error.generic',
      connection: 'requestDemo.error.connection',
    },
  },
  platform: {
    nav: {
      dashboard: 'platform.nav.dashboard',
      tenants: 'platform.nav.tenants',
      leads: 'platform.nav.leads',
      audit: 'platform.nav.audit',
    },
    tenants: {
      title: 'platform.tenants.title',
    },
    leads: {
      title: 'platform.leads.title',
      table: {
        schoolName: 'platform.leads.table.schoolName',
        responsibleName: 'platform.leads.table.responsibleName',
        email: 'platform.leads.table.email',
        phone: 'platform.leads.table.phone',
        status: 'platform.leads.table.status',
        createdAt: 'platform.leads.table.createdAt',
      },
      status: {
        new: 'platform.leads.status.new',
        contacted: 'platform.leads.status.contacted',
        converted: 'platform.leads.status.converted',
      },
      actions: {
        markContacted: 'platform.leads.actions.markContacted',
        markConverted: 'platform.leads.actions.markConverted',
        convertToTenant: 'platform.leads.actions.convertToTenant',
      },
    },
    audit: {
      title: 'platform.audit.title',
    },
  },
} as const;

export type Locale = 'pt-BR' | 'en-US';
export const defaultLocale: Locale = 'pt-BR';
export const locales: Locale[] = ['pt-BR', 'en-US'];
