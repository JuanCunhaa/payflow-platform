'use client';

import { FormEvent, useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';

type SettingsPayload = {
  displayName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export default function SchoolSettingsPage() {
  const { t } = useI18n();
  const { apiFetch } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const res = await apiFetch('/school/settings');
        if (!res.ok) {
          setError(t(i18nKeys.school.settings.feedback.loadError));
          return;
        }
        const data = (await res.json()) as SettingsPayload;
        if (cancelled) return;

        setDisplayName(data.displayName ?? '');
        setContactEmail(data.contactEmail ?? '');
        setContactPhone(data.contactPhone ?? '');
      } catch {
        if (!cancelled) {
          setError(t(i18nKeys.school.settings.feedback.loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, t]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await apiFetch('/school/settings', {
        method: 'PUT',
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
        }),
      });

      if (!res.ok) {
        setError(t(i18nKeys.school.settings.feedback.saveError));
        return;
      }

      const data = (await res.json()) as SettingsPayload;
      setDisplayName(data.displayName ?? '');
      setContactEmail(data.contactEmail ?? '');
      setContactPhone(data.contactPhone ?? '');
      setSuccess(true);
    } catch {
      setError(t(i18nKeys.school.settings.feedback.saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 10px 25px rgba(15,23,42,0.04)',
        maxWidth: '640px',
      }}
    >
      <h1
        style={{
          fontSize: '20px',
          marginTop: 0,
          marginBottom: '8px',
        }}
      >
        {t(i18nKeys.school.pages.settings.title)}
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: '#64748b',
          marginBottom: '16px',
        }}
      >
        {t(i18nKeys.school.pages.settings.description)}
      </p>

      {loading && (
        <p
          style={{
            fontSize: '14px',
            color: '#64748b',
          }}
        >
          {t(i18nKeys.common.loading)}
        </p>
      )}

      {!loading && (
        <>
          {error && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px',
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

          {success && !error && (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                backgroundColor: '#ecfdf3',
                color: '#166534',
                fontSize: '14px',
              }}
            >
              {/* Reutilizando mensagem genérica de sucesso de tenants */}
              {t(i18nKeys.school.settings.feedback.saveSuccess)}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              marginTop: '8px',
            }}
          >
            <div>
              <label
                htmlFor="displayName"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
              >
                {t(i18nKeys.platform.tenants.form.name)}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
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
                htmlFor="contactEmail"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
              >
                {t(i18nKeys.requestDemo.form.email)}
              </label>
              <input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
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
                htmlFor="contactPhone"
                style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}
              >
                {t(i18nKeys.requestDemo.form.phone)}
              </label>
              <input
                id="contactPhone"
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5f5',
                }}
              />
            </div>

            <fieldset
              style={{
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px dashed #e2e8f0',
              }}
            >
              <legend
                style={{
                  padding: '0 4px',
                  fontSize: '13px',
                  color: '#6b7280',
                }}
              >
                {/* Placeholder para futuras preferências de cobrança */}
                Preferências de cobrança
              </legend>
              <p
                style={{
                  fontSize: '13px',
                  color: '#9ca3af',
                  margin: 0,
                }}
              >
                Esta seção será usada para configurar regras de cobrança, vencimentos e integrações
                de pagamento (em breve).
              </p>
            </fieldset>

            <button
              type="submit"
              disabled={saving}
              style={{
                marginTop: '12px',
                alignSelf: 'flex-start',
                padding: '8px 16px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                fontSize: '14px',
              }}
            >
              {saving ? t(i18nKeys.common.loading) : t(i18nKeys.platform.tenants.form.submitEdit)}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
