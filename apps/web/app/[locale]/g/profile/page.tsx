'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type GuardianProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export default function GuardianProfilePage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [profile, setProfile] = useState<GuardianProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        const res = await apiFetch('/guardian/me');
        if (!res.ok) {
          setError(t(i18nKeys.common.error));
          return;
        }
        const data = (await res.json()) as GuardianProfile;
        if (!cancelled) {
          setProfile(data);
          setPhone(data.phone ?? '');
        }
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.common.error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, t]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await apiFetch('/guardian/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        setError(t(i18nKeys.common.error));
        return;
      }

      const updated = (await res.json()) as { phone: string; name?: string };
      setProfile({ ...profile, phone: updated.phone });
      setPhone(updated.phone ?? '');
      setSuccess(true);
    } catch {
      setError(t(i18nKeys.common.error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section
        style={{
          padding: '16px',
          fontSize: '14px',
          color: '#64748b',
        }}
      >
        {t(i18nKeys.common.loading)}
      </section>
    );
  }

  if (!profile) {
    return (
      <section
        style={{
          padding: '16px',
          fontSize: '14px',
          color: '#b91c1c',
        }}
      >
        {error ?? t(i18nKeys.common.error)}
      </section>
    );
  }

  return (
    <section
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <h1
        style={{
          marginTop: 0,
          marginBottom: '12px',
          fontSize: '20px',
          fontWeight: 600,
          color: '#0f172a',
        }}
      >
        {t(i18nKeys.guardian.pages.dashboard.title)}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="guardian-name"
            style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
          >
            {t(i18nKeys.guardianRegister.form.name)}
          </label>
          <input
            id="guardian-name"
            type="text"
            value={profile.name}
            readOnly
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f9fafb',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="guardian-email"
            style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
          >
            {t(i18nKeys.login.email)}
          </label>
          <input
            id="guardian-email"
            type="email"
            value={profile.email}
            readOnly
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#f9fafb',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label
            htmlFor="guardian-phone"
            style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}
          >
            {t(i18nKeys.guardianRegister.form.phone)}
          </label>
          <input
            id="guardian-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
            }}
          />
        </div>

        {error ? (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#b91c1c',
            }}
          >
            {error}
          </p>
        ) : null}

        {success ? (
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#16a34a',
            }}
          >
            {t(i18nKeys.requestDemo.success.title)}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: '8px',
            alignSelf: 'flex-start',
            padding: '8px 14px',
            borderRadius: '999px',
            border: 'none',
            backgroundColor: saving ? '#94a3b8' : '#6366f1',
            color: '#ffffff',
            cursor: saving ? 'default' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {saving ? t(i18nKeys.common.loading) : t(i18nKeys.guardianRegister.form.submit)}
        </button>
      </form>
    </section>
  );
}

