import { redirect } from 'next/navigation';
import { defaultLocale } from '@payflow/shared';

export default function TenantNotFoundPage() {
  redirect(`/${defaultLocale}/tenant-not-found`);
}
