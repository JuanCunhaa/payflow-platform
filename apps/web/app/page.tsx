import { redirect } from 'next/navigation';
import { defaultLocale } from '@payflow/shared';

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}

