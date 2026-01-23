import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function TermsPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return (
        <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1 container mx-auto py-12 px-4 max-w-4xl">
                <div className="mb-8">
                    <Link href={`/${params.locale}`}>
                        <Button variant="ghost" className="pl-0 gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {dict.common.back}
                        </Button>
                    </Link>
                </div>

                <h1 className="text-3xl font-bold mb-6">{dict.legal.terms.title}</h1>
                <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                    {dict.legal.terms.content}
                </div>

                <div className="mt-12 pt-8 border-t">
                    <Link href={`/${params.locale}`}>
                        <Button variant="outline">
                            {dict.dashboard.backToHome}
                        </Button>
                    </Link>
                </div>
            </main>
            <Footer />
        </div>
    );
}
