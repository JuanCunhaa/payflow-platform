'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';

export default function ResetPasswordPage() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('token') ?? '';
    setToken(fromQuery);
  }, [searchParams]);

  function validateLocally(): boolean {
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword || !trimmedConfirm || trimmedPassword !== trimmedConfirm) {
      setError(t(i18nKeys.passwordReset.reset.error.validation));
      return false;
    }

    if (
      trimmedPassword.length < 8 ||
      !/[A-Za-z]/.test(trimmedPassword) ||
      !/\d/.test(trimmedPassword)
    ) {
      setError(t(i18nKeys.passwordReset.reset.error.weakPassword));
      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError(t(i18nKeys.passwordReset.reset.error.invalidToken));
      return;
    }

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

      const response = await fetch(`${getApiBase()}/auth/reset-password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      if (!response.ok) {
        let code: string | undefined;
        try {
          const data = (await response.json()) as { code?: string };
          code = data.code;
        } catch {
          // ignore body parse errors
        }

        if (code === 'weak_password') {
          setError(t(i18nKeys.passwordReset.reset.error.weakPassword));
        } else if (code === 'invalid_token') {
          setError(t(i18nKeys.passwordReset.reset.error.invalidToken));
        } else if (code === 'reset_token_expired') {
          setError(t(i18nKeys.passwordReset.reset.error.expiredToken));
        } else if (code === 'reset_token_used') {
          setError(t(i18nKeys.passwordReset.reset.error.usedToken));
        } else {
          setError(t(i18nKeys.passwordReset.reset.error.generic));
        }
        return;
      }

      setSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError(t(i18nKeys.passwordReset.reset.error.connection));
    } finally {
      setSubmitting(false);
    }
  }

  function handleGoToLogin() {
    const base = locale || 'pt-BR';
    router.push(`/${base}/login`);
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
        {t(i18nKeys.passwordReset.reset.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          marginBottom: '24px',
        }}
      >
        {t(i18nKeys.passwordReset.reset.description)}
      </p>

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
          <p style={{ margin: 0 }}>{t(i18nKeys.passwordReset.reset.success)}</p>
          <button
            type="button"
            onClick={handleGoToLogin}
            style={{
              marginTop: '8px',
              padding: '8px 14px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: '#6366f1',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {t(i18nKeys.login.title)}
          </button>
        </div>
      )}

      {!success && (
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
              htmlFor="reset-password"
              style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
            >
              {t(i18nKeys.passwordReset.reset.newPasswordLabel)}
            </label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label
              htmlFor="reset-password-confirm"
              style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
            >
              {t(i18nKeys.passwordReset.reset.confirmPasswordLabel)}
            </label>
            <input
              id="reset-password-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
            disabled={submitting || !token}
            style={{
              marginTop: '4px',
              padding: '10px 16px',
              borderRadius: '999px',
              border: 'none',
              backgroundColor: submitting || !token ? '#94a3b8' : '#6366f1',
              color: '#ffffff',
              cursor: submitting || !token ? 'default' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.passwordReset.reset.submit)}
          </button>
        </form>
      )}
    </main>
  );
}
