import { getDictionary } from '@/lib/i18n';
import { Locale } from '@payflow/shared';

export default async function PrivacyPage({ params }: { params: { locale: Locale } }) {
    const dict = await getDictionary(params.locale);

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl">
            <h1 className="text-3xl font-bold mb-6">{dict.legal.privacy.title}</h1>
            <div className="whitespace-pre-wrap text-muted-foreground">
                {dict.legal.privacy.content}
            </div>
        </div>
    );
}
