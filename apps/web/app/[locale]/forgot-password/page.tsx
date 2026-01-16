'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';

export default function ForgotPasswordPage() {
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateLocally(): boolean {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isEmailValid(trimmedEmail)) {
      setError(t(i18nKeys.passwordReset.forgot.error.validation));
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateLocally()) {
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (process.env.NODE_ENV !== 'production') {
        headers['x-payflow-bypass-ratelimit'] = '1';
      }

      const response = await fetch(`${getApiBase()}/auth/forgot-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        try {
          const data = (await response.json()) as { code?: string };

          // In casos de rate limit, mantemos a resposta genérica
          // de sucesso para o usuário, já que a API não revela
          // se o email existe ou não.
          if (data.code === 'rate_limit_exceeded') {
            setSuccess(true);
            return;
          }

          if (data.code === 'validation_error') {
            setError(t(i18nKeys.passwordReset.forgot.error.validation));
          } else {
            setError(t(i18nKeys.passwordReset.forgot.error.generic));
          }
        } catch {
          setError(t(i18nKeys.passwordReset.forgot.error.generic));
        }
      } else {
        setSuccess(true);
      }
    } catch {
      setError(t(i18nKeys.passwordReset.forgot.error.connection));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        maxWidth: '480px',
        margin: '50px auto',
      }}
    >
      <h1
        style={{
          fontSize: '24px',
          marginBottom: '8px',
        }}
      >
        {t(i18nKeys.passwordReset.forgot.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          marginBottom: '24px',
        }}
      >
        {t(i18nKeys.passwordReset.forgot.description)}
      </p>

      {success && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#ecfdf3',
            border: '1px solid #bbf7d0',
            color: '#166534',
            fontSize: '14px',
          }}
        >
          {t(i18nKeys.passwordReset.forgot.success)}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
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
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            htmlFor="forgot-email"
            style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
          >
            {t(i18nKeys.passwordReset.forgot.emailLabel)}
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '4px',
            padding: '10px 16px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: submitting ? '#94a3b8' : '#6366f1',
            color: '#ffffff',
            cursor: submitting ? 'default' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {submitting
            ? t(i18nKeys.common.loading)
            : t(i18nKeys.passwordReset.forgot.submit)}
        </button>
      </form>
    </main>
  );
}
