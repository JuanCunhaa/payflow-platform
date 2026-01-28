import { UserTicketForm } from '@/components/tickets/user-ticket-form';
import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function NewTicketPage({ params }: { params: { locale: Locale } }) {
  const dict = await getDictionary(params.locale);
  const tTickets = (dict.tickets as any) || {};

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {tTickets.create?.title || 'New Ticket'}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <UserTicketForm />
        </CardContent>
      </Card>
    </div>
  );
}
