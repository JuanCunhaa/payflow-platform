'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { i18nKeys, isEmailValid } from '@payflow/shared';
import { useI18n } from '../../../i18n-context';
import { getApiBase } from '../../../api-base';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/auth-layout';

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

    if (
      trimmedPassword.length < 8 ||
      !/[A-Za-z]/.test(trimmedPassword) ||
      !/\d/.test(trimmedPassword)
    ) {
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
      const response = await fetch(`${getApiBase()}/public/register-guardian`, {
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
    <AuthLayout
      title={t(i18nKeys.guardianRegister.title)}
      description={t(i18nKeys.guardianRegister.description)}
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
                  {t(i18nKeys.guardianRegister.success.title)}
                </h3>
                <p className="text-sm text-green-800">
                  {t(i18nKeys.guardianRegister.success.description)}
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian-name">{t(i18nKeys.guardianRegister.form.name)}</Label>
                  <Input
                    id="guardian-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian-email">{t(i18nKeys.guardianRegister.form.email)}</Label>
                  <Input
                    id="guardian-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian-phone">{t(i18nKeys.guardianRegister.form.phone)}</Label>
                <Input
                  id="guardian-phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guardian-password">
                    {t(i18nKeys.guardianRegister.form.password)}
                  </Label>
                  <PasswordInput
                    id="guardian-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardian-confirm">
                    {t(i18nKeys.guardianRegister.form.confirmPassword)}
                  </Label>
                  <PasswordInput
                    id="guardian-confirm"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardian-school-code">
                  {t(i18nKeys.guardianRegister.form.schoolCode)}
                </Label>
                <Input
                  id="guardian-school-code"
                  value={schoolCode}
                  onChange={(event) => setSchoolCode(event.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? t(i18nKeys.common.loading) : t(i18nKeys.guardianRegister.form.submit)}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
