'use client';

import { FormEvent, useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../i18n-context';
import { getApiBase } from '../../api-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

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
    <AuthLayout
      title={t(i18nKeys.requestDemo.title)}
      description={t(i18nKeys.requestDemo.description)}
    >
      <Card>
        <CardContent className="pt-6">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="rounded-full bg-green-100 p-3 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  {t(i18nKeys.requestDemo.success.title)}
                </h3>
                <p className="text-sm text-green-800">
                  {t(i18nKeys.requestDemo.success.description)}
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="responsibleName">
                  {t(i18nKeys.requestDemo.form.responsibleName)}
                </Label>
                <Input
                  id="responsibleName"
                  value={responsibleName}
                  onChange={(event) => setResponsibleName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolName">{t(i18nKeys.requestDemo.form.schoolName)}</Label>
                <Input
                  id="schoolName"
                  value={schoolName}
                  onChange={(event) => setSchoolName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t(i18nKeys.requestDemo.form.email)}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t(i18nKeys.requestDemo.form.phone)}</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.requestDemo.form.submit)}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
