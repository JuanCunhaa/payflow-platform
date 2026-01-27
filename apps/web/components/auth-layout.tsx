'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useI18n } from '../app/i18n-context';
import { i18nKeys } from '@payflow/shared';
import { ModeToggle } from './mode-toggle';
import { LanguageToggle } from './language-toggle';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
    showBackButton?: boolean;
}

export function AuthLayout({
    children,
    title,
    description,
    showBackButton = true,
}: AuthLayoutProps) {
    const { t, locale } = useI18n();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4 sm:p-8">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="flex items-center gap-2 mb-4">
                        {/* Logo Placeholder */}
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-xl">N</span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Cobra Nex</span>
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>

                {/* Content Card */}
                {children}

                {/* Footer / Controls */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    {showBackButton ? (
                        <Link
                            href={`/${locale}`}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            {t(i18nKeys.nav.home)}
                        </Link>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <Link
                            href={locale === 'pt-BR' ? '/en-US' : '/pt-BR'}
                            className="font-medium hover:text-foreground transition-colors"
                        >
                            {locale === 'pt-BR' ? 'EN' : 'PT'}
                        </Link>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="text-center text-xs text-muted-foreground mt-8">
                    &copy; {new Date().getFullYear()} Cobra Nex. All rights reserved.
                </div>
            </div>
        </div>
    );
}
