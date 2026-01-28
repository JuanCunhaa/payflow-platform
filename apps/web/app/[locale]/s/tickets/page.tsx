import { TicketList } from '@/components/tickets/ticket-list';
import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';

export default async function SchoolTicketsPage({ params }: { params: { locale: Locale } }) {
  const dict = await getDictionary(params.locale);
  const tTickets = (dict.tickets as any) || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{tTickets.list?.title || 'Tickets'}</h1>
        <p className="text-muted-foreground">{tTickets.list?.description || 'Manage tickets.'}</p>
      </div>
      <TicketList adminView={true} />
    </div>
  );
}
