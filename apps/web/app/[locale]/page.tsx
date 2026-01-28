'use client';

import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../i18n-context';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArrowRight, CheckCircle2, LayoutDashboard, ShieldCheck, Wallet } from 'lucide-react';

export default function Home() {
  const { t, locale } = useI18n();

  const loginHref = `/${locale}/login`;
  const guardianHref = `/${locale}/register/guardian`;
  const demoHref = `/${locale}/request-demo`;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container grid items-center gap-10 py-24 md:grid-cols-2 lg:gap-20">
          <div className="flex flex-col items-start gap-6">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
              {t(i18nKeys.landing.title)}
            </h1>
            <p className="text-xl text-muted-foreground">{t(i18nKeys.landing.subtitle)}</p>
            <p className="text-lg text-muted-foreground">{t(i18nKeys.landing.description)}</p>
            <div className="flex flex-wrap gap-4">
              <Link href={loginHref}>
                <Button size="lg" className="gap-2">
                  {t(i18nKeys.landing.buttons.login)}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={guardianHref}>
                <Button size="lg" variant="secondary">
                  {t(i18nKeys.landing.buttons.guardian)}
                </Button>
              </Link>
              <Link href={demoHref}>
                <Button size="lg" variant="outline">
                  {t(i18nKeys.landing.buttons.demo)}
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative aspect-square md:aspect-video rounded-xl bg-muted border p-8 shadow-2xl">
            {/* Abstract UI Mockup */}
            <div className="absolute inset-4 rounded-lg bg-background shadow-sm border p-6 flex flex-col gap-4">
              <div className="h-8 w-1/3 bg-muted rounded animate-pulse" />
              <div className="flex-1 bg-muted/50 rounded border border-dashed border-border" />
              <div className="flex gap-4">
                <div className="h-10 flex-1 bg-primary/10 rounded" />
                <div className="h-10 flex-1 bg-muted rounded" />
              </div>
            </div>
          </div>
        </section>

        {/* Problems Section */}
        <section className="bg-muted/50 py-24">
          <div className="container">
            <div className="mx-auto max-w-[800px] text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t(i18nKeys.landing.problem.title)}
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                { icon: LayoutDashboard, text: t(i18nKeys.landing.problem.spreadsheets) },
                { icon: Wallet, text: t(i18nKeys.landing.problem.receipts) },
                { icon: ShieldCheck, text: t(i18nKeys.landing.problem.whatsapp) },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center p-6 bg-card rounded-xl shadow-sm border text-center"
                >
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
                    <item.icon className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-muted-foreground font-medium">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Grid */}
        <section className="container py-24">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t(i18nKeys.landing.solution.title)}
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              t(i18nKeys.landing.solution.events),
              t(i18nKeys.landing.solution.tuitions),
              t(i18nKeys.landing.solution.oneOff),
              t(i18nKeys.landing.solution.communication),
              t(i18nKeys.landing.solution.finance),
            ].map((text, i) => (
              <div
                key={i}
                className="group p-6 rounded-xl border bg-card hover:border-primary/50 transition-colors hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground font-medium">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Proof Section */}
        <section className="bg-slate-900 text-white py-24">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-6">{t(i18nKeys.landing.proof.title)}</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              {t(i18nKeys.landing.proof.subtitle)}
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-24 text-center">
          <div className="bg-primary/5 rounded-3xl p-12 md:p-24 border border-primary/10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-6">
              {t(i18nKeys.landing.finalCta.title)}
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t(i18nKeys.landing.finalCta.subtitle)}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href={loginHref}>
                <Button size="lg" className="h-12 px-8 text-lg">
                  {t(i18nKeys.landing.buttons.login)}
                </Button>
              </Link>
              <Link href={demoHref}>
                <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                  {t(i18nKeys.landing.buttons.demo)}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
