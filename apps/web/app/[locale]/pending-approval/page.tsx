'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';

export default function PendingApprovalPage() {
  const { t } = useI18n();

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'sans-serif',
        maxWidth: '600px',
        margin: '50px auto',
      }}
    >
      <h1>{t(i18nKeys.auth.pendingApproval.title)}</h1>
      <p>{t(i18nKeys.auth.pendingApproval.description)}</p>
    </main>
  );
}
