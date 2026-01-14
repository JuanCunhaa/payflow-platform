'use client';

import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';

export default function SchoolClassesPage() {
  const { t } = useI18n();

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 25px rgba(15,23,42,0.04)',
      }}
    >
      <h1
        style={{
          fontSize: '20px',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        {t(i18nKeys.school.pages.classes.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          margin: 0,
        }}
      >
        {t(i18nKeys.school.pages.classes.description)}
      </p>
    </div>
  );
}

