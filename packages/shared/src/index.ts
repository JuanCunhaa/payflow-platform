export type UUID = string;

export const i18nKeys = {
  common: {
    ok: 'common.ok',
  },
  web: {
    title: 'web.title',
    labels: {
      api: 'web.labels.api',
      i18n: 'web.labels.i18n',
    },
    messages: {
      apiNotConfigured: 'web.messages.apiNotConfigured',
    },
  },
};

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
