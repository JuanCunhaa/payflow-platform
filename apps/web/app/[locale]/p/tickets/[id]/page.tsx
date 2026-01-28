import { TicketChat } from '@/components/tickets/ticket-chat';
import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';

export default async function PlatformTicketChatPage({
  params,
}: {
  params: { locale: Locale; id: string };
}) {
  const id = params.id;

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex-1">
        <TicketChat ticketId={id} />
      </div>
    </div>
  );
}
