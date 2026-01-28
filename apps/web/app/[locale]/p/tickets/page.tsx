import { TicketList } from '@/components/tickets/ticket-list';
import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';

export default async function PlatformTicketsPage({ params }: { params: { locale: Locale } }) {
  const dict = await getDictionary(params.locale);
  const tTickets = (dict.tickets as any) || {};

  return (
    <section className="flex flex-col h-[calc(100vh-10rem)] gap-4">
      <div className="pb-2">
        <h1 className="text-2xl font-bold tracking-tight">{tTickets.list?.title || 'Tickets'}</h1>
        <p className="text-muted-foreground">{tTickets.list?.description || 'Manage tickets.'}</p>
      </div>
      <div className="flex-1 overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <TicketList adminView={true} />
        </div>
      </div>
    </section>
  );
}
