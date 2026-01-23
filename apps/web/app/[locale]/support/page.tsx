import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';
import { GuestTicketForm } from '@/components/tickets/guest-ticket-form';

export default async function SupportPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return (
        <div className="container mx-auto py-12 px-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-4">{dict.support.title}</h1>
            <p className="text-muted-foreground mb-8">
                {dict.support.description}
            </p>

            <div className="border rounded-lg p-6 bg-card">
                <GuestTicketForm />
            </div>
        </div>
    );
}
