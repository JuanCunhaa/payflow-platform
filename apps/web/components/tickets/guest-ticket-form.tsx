'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useI18n } from '../../app/i18n-context';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getApiBase } from '../../app/api-base';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

type FormData = z.infer<typeof formSchema>;

export function GuestTicketForm() {
  const { dict } = useI18n();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/tickets/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to create ticket');
      }

      setSuccess(true);
      reset();
    } catch (err) {
      setError(dict.common?.error || 'Error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 text-green-900 p-6 rounded-lg text-center border border-green-200">
        <h3 className="text-lg font-semibold mb-2">{dict.support.guestForm.success}</h3>
        <Button
          onClick={() => setSuccess(false)}
          variant="outline"
          className="mt-4 bg-white hover:bg-green-50 text-green-900 border-green-200"
        >
          {dict.support.guestForm.sendAnother || 'Send another'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{dict.support.guestForm.name}</Label>
        <Input id="name" {...register('name')} placeholder={dict.support.guestForm.name} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{dict.support.guestForm.email}</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder={dict.support.guestForm.email}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">{dict.support.guestForm.subject}</Label>
        <Input id="subject" {...register('subject')} placeholder={dict.support.guestForm.subject} />
        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{dict.support.guestForm.message}</Label>
        <textarea
          id="message"
          {...register('message')}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={dict.support.guestForm.message}
        />
        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? dict.common.loading : dict.support.guestForm.submit}
      </Button>
    </form>
  );
}
