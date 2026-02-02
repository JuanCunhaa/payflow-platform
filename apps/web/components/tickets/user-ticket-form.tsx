'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useI18n } from '@/app/i18n-context';
import { useAuth } from '@/app/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  type: z.enum(['GENERAL', 'FINANCIAL', 'ACADEMIC', 'TECHNICAL', 'OTHER']).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UserTicketFormProps {
  redirectBase?: string;
}

export function UserTicketForm({ redirectBase = '/tickets' }: UserTicketFormProps) {
  const { dict, locale } = useI18n(); // Helper to safely access nested keys
  const tTickets = (dict.tickets as any) || {};

  const { apiFetch } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      priority: 'MEDIUM',
      type: 'GENERAL',
    },
  });

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create ticket');
      }

      const ticket = await res.json();
      router.push(`/${locale}${redirectBase}/${ticket.id}`); // Redirect to chat
    } catch (err: any) {
      if (err.message.includes('already have an open ticket')) {
        setError(tTickets.create?.errorOneOpen || 'You already have an open ticket.');
      } else {
        setError(dict.common?.error || 'Error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="subject">{tTickets.create?.subject || 'Subject'}</Label>
        <Input id="subject" {...register('subject')} />
        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">{tTickets.create?.type || 'Type'}</Label>
          <select
            id="type"
            {...register('type')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="GENERAL">{tTickets.type?.GENERAL || 'General'}</option>
            <option value="FINANCIAL">{tTickets.type?.FINANCIAL || 'Financial'}</option>
            <option value="ACADEMIC">{tTickets.type?.ACADEMIC || 'Academic'}</option>
            <option value="TECHNICAL">{tTickets.type?.TECHNICAL || 'Technical'}</option>
            <option value="OTHER">{tTickets.type?.OTHER || 'Other'}</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">{tTickets.create?.priority || 'Priority'}</Label>
          <select
            id="priority"
            {...register('priority')}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="LOW">{tTickets.priority?.LOW || 'Low'}</option>
            <option value="MEDIUM">{tTickets.priority?.MEDIUM || 'Medium'}</option>
            <option value="HIGH">{tTickets.priority?.HIGH || 'High'}</option>
            <option value="URGENT">{tTickets.priority?.URGENT || 'Urgent'}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{tTickets.create?.message || 'Message'}</Label>
        <textarea
          id="message"
          {...register('message')}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? dict.common.loading : tTickets.create?.submit || 'Create'}
      </Button>
    </form>
  );
}
