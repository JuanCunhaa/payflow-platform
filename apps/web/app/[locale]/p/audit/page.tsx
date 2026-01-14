'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';

export default function PlatformAuditPage() {
  const { t } = useI18n();

  return (
    <section>
      <h1
        style={{
          fontSize: '20px',
          marginBottom: '12px',
        }}
      >
        {t(i18nKeys.platform.audit.title)}
      </h1>
    </section>
  );
}

