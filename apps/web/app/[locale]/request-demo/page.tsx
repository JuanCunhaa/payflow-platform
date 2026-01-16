'use client';

import { FormEvent, useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';

export default function RequestDemoPage() {
  const { t } = useI18n();

  const [responsibleName, setResponsibleName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const trimmedName = responsibleName.trim();
    const trimmedSchool = schoolName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedSchool || !trimmedEmail || !trimmedPhone) {
      setError(t(i18nKeys.requestDemo.error.validation));
      return false;
    }

    if (!isEmailValid(trimmedEmail)) {
      setError(t(i18nKeys.requestDemo.error.validation));
      return false;
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setError(t(i18nKeys.requestDemo.error.validation));
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${getApiBase()}/public/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: responsibleName.trim(),
          schoolName: schoolName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      });

      if (!response.ok) {
        try {
          const data = (await response.json()) as { code?: string };
          if (data.code === 'validation_error') {
            setError(t(i18nKeys.requestDemo.error.validation));
          } else if (data.code === 'rate_limit_exceeded') {
            setError(t(i18nKeys.requestDemo.error.generic));
          } else {
            setError(t(i18nKeys.requestDemo.error.generic));
          }
        } catch {
          setError(t(i18nKeys.requestDemo.error.generic));
        }
        return;
      }

      setSuccess(true);
      setResponsibleName('');
      setSchoolName('');
      setEmail('');
      setPhone('');
    } catch {
      setError(t(i18nKeys.requestDemo.error.connection));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        maxWidth: '640px',
        margin: '50px auto',
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          marginBottom: '8px',
        }}
      >
        {t(i18nKeys.requestDemo.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          marginBottom: '24px',
        }}
      >
        {t(i18nKeys.requestDemo.description)}
      </p>

      {success && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            backgroundColor: '#ecfdf3',
            color: '#166534',
            fontSize: '14px',
          }}
        >
          <strong>{t(i18nKeys.requestDemo.success.title)}</strong>
          <br />
          {t(i18nKeys.requestDemo.success.description)}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div>
          <label
            htmlFor="responsibleName"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.requestDemo.form.responsibleName)}
          </label>
          <input
            id="responsibleName"
            type="text"
            value={responsibleName}
            onChange={(event) => setResponsibleName(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="schoolName"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.requestDemo.form.schoolName)}
          </label>
          <input
            id="schoolName"
            type="text"
            value={schoolName}
            onChange={(event) => setSchoolName(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.requestDemo.form.email)}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="phone"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.requestDemo.form.phone)}
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5f5',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '4px',
            padding: '10px 16px',
            fontSize: '15px',
            borderRadius: '999px',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            backgroundColor: '#2563eb',
            color: '#ffffff',
          }}
        >
          {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.requestDemo.form.submit)}
        </button>
      </form>
    </main>
  );
}
