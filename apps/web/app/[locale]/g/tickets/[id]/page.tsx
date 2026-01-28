import { TicketChat } from '@/components/tickets/ticket-chat';
import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';

export default async function TicketChatPage({
  params,
}: {
  params: { locale: Locale; id: string };
}) {
  // params is async in Next 15? No, in Next 14.
  // Assuming standard params.
  const id = params.id;
  const dict = await getDictionary(params.locale);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Height constraint handled by layout or component */}
      <div className="flex-1">
        <TicketChat ticketId={id} />
      </div>
    </div>
  );
}
