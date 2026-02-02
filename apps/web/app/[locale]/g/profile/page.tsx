'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { i18nKeys } from '@payflow/shared';
import { Loader2, Save } from 'lucide-react';
import { useI18n } from '../../../i18n-context';
import { useAuth } from '../../../auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="flex justify-center p-8 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center p-8 text-destructive">
        {error ?? t(i18nKeys.common.error)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(i18nKeys.guardian.pages.profile.title)}
        </h1>
        <p className="text-muted-foreground">{t(i18nKeys.guardian.pages.profile.description)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t(i18nKeys.guardian.profile.title)}</CardTitle>
          <CardDescription>{t(i18nKeys.guardian.profile.description)}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="guardian-name">{t(i18nKeys.guardianRegister.form.name)}</Label>
              <Input
                id="guardian-name"
                value={profile.name}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian-email">{t(i18nKeys.login.email)}</Label>
              <Input
                id="guardian-email"
                type="email"
                value={profile.email}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guardian-phone">{t(i18nKeys.guardianRegister.form.phone)}</Label>
              <Input
                id="guardian-phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t(i18nKeys.common.placeholders.phone)}
              />
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            {success && (
              <p className="text-sm font-medium text-green-600 dark:text-green-500">
                {t(i18nKeys.school.settings.feedback.saveSuccess)}
              </p>
            )}

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t(i18nKeys.common.loading)}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t(i18nKeys.platform.tenants.form.submitEdit)}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
