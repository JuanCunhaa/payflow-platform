import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';
import { GuestTicketForm } from '@/components/tickets/guest-ticket-form';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function SupportPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 container mx-auto py-12 px-4 max-w-2xl">
                <div className="mb-8">
                    <Link href={`/${params.locale}`}>
                        <Button variant="ghost" className="pl-0 gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {dict.common.back}
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-4">{dict.support.title}</h1>
                <p className="text-muted-foreground mb-8">
                    {dict.support.description}
                </p>

                <div className="border rounded-lg p-6 bg-card">
                    <GuestTicketForm />
                </div>
            </main>
            <Footer />
        </div>
    );
}
