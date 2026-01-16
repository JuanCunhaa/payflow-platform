'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../i18n-context';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

export default function RegisterGuardianPage() {
  const { t } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [schoolCode, setSchoolCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validateLocally(): boolean {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();
    const trimmedSchoolCode = schoolCode.trim();

    if (
      !trimmedName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedPassword ||
      !trimmedConfirmPassword ||
      !trimmedSchoolCode
    ) {
      setError(t(i18nKeys.guardianRegister.error.validation));
      return false;
    }

    if (!isEmailValid(trimmedEmail)) {
      setError(t(i18nKeys.guardianRegister.error.validation));
      return false;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError(t(i18nKeys.guardianRegister.error.validation));
      return false;
    }

    if (trimmedPassword.length < 8 || !/[A-Za-z]/.test(trimmedPassword) || !/\d/.test(trimmedPassword)) {
      setError(t(i18nKeys.guardianRegister.error.weakPassword));
      return false;
    }

    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setError(t(i18nKeys.guardianRegister.error.validation));
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
      const response = await fetch(`${API_BASE}/public/register-guardian`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          confirmPassword,
          schoolCode,
        }),
      });

      if (!response.ok) {
        let code: string | undefined;
        try {
          const data = (await response.json()) as { code?: string };
          code = data.code;
        } catch {
          // ignore parse errors
        }

        if (code === 'weak_password') {
          setError(t(i18nKeys.guardianRegister.error.weakPassword));
        } else if (code === 'school_code_not_found') {
          setError(t(i18nKeys.guardianRegister.error.schoolCode));
        } else if (code === 'email_in_use') {
          setError(t(i18nKeys.guardianRegister.error.emailInUse));
        } else {
          setError(t(i18nKeys.guardianRegister.error.generic));
        }
        return;
      }

      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setConfirmPassword('');
      setSchoolCode('');
    } catch {
      setError(t(i18nKeys.guardianRegister.error.connection));
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
        {t(i18nKeys.guardianRegister.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          marginBottom: '24px',
        }}
      >
        {t(i18nKeys.guardianRegister.description)}
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
          <strong>{t(i18nKeys.guardianRegister.success.title)}</strong>
          <br />
          {t(i18nKeys.guardianRegister.success.description)}
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
            htmlFor="guardian-name"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.name)}
          </label>
          <input
            id="guardian-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
            htmlFor="guardian-email"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.email)}
          </label>
          <input
            id="guardian-email"
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
            htmlFor="guardian-phone"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.phone)}
          </label>
          <input
            id="guardian-phone"
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

        <div>
          <label
            htmlFor="guardian-password"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.password)}
          </label>
          <input
            id="guardian-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
            htmlFor="guardian-confirm-password"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.confirmPassword)}
          </label>
          <input
            id="guardian-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
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
            htmlFor="guardian-school-code"
            style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
          >
            {t(i18nKeys.guardianRegister.form.schoolCode)}
          </label>

          <input
            id="guardian-school-code"
            type="text"
            value={schoolCode}
            onChange={(event) => setSchoolCode(event.target.value)}
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
          {submitting
            ? t(i18nKeys.common.loading)
            : t(i18nKeys.guardianRegister.form.submit)}
        </button>
      </form>
    </main>
  );
}

