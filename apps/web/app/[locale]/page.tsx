'use client';

import Link from 'next/link';
import { i18nKeys } from '@payflow/shared';
import { useI18n } from '../i18n-context';

export default function Home() {
  const { t, locale } = useI18n();

  const loginHref = `/${locale}/login`;
  const guardianHref = `/${locale}/register/guardian`;
  const demoHref = `/${locale}/request-demo`;

  return (
    <main
      style={{
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#0f172a',
        background: 'radial-gradient(circle at top left, #eff6ff, #ffffff)',
        minHeight: '100vh',
      }}
    >
      <header
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '20px' }}>PayFlow</div>
        <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href={locale === 'pt-BR' ? '/en-US' : '/pt-BR'}>
            {locale === 'pt-BR'
              ? t(i18nKeys.common.language.english)
              : t(i18nKeys.common.language.portuguese)}
          </Link>
          <Link href={loginHref} style={{ fontSize: '14px' }}>
            {t(i18nKeys.landing.buttons.login)}
          </Link>
        </nav>
      </header>

      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '40px 24px 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.5fr)',
          gap: '32px',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '36px',
              lineHeight: 1.1,
              marginBottom: '16px',
            }}
          >
            {t(i18nKeys.landing.title)}
          </h1>
          <p style={{ fontSize: '18px', color: '#475569', marginBottom: '24px' }}>
            {t(i18nKeys.landing.subtitle)}
          </p>
          <p style={{ fontSize: '15px', color: '#64748b', marginBottom: '24px' }}>
            {t(i18nKeys.landing.description)}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <Link href={loginHref}>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  borderRadius: '999px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                }}
              >
                {t(i18nKeys.landing.buttons.login)}
              </button>
            </Link>
            <Link href={guardianHref}>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  borderRadius: '999px',
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                }}
              >
                {t(i18nKeys.landing.buttons.guardian)}
              </button>
            </Link>
            <Link href={demoHref}>
              <button
                style={{
                  padding: '10px 20px',
                  fontSize: '15px',
                  cursor: 'pointer',
                  borderRadius: '999px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              >
                {t(i18nKeys.landing.buttons.demo)}
              </button>
            </Link>
          </div>
        </div>

        <div
          style={{
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)',
          }}
        >
          <h2 style={{ fontSize: '16px', marginBottom: '12px', color: '#0f172a' }}>
            {t(i18nKeys.landing.problem.title)}
          </h2>
          <ul
            style={{ listStyle: 'disc', paddingLeft: '18px', color: '#475569', fontSize: '14px' }}
          >
            <li>{t(i18nKeys.landing.problem.spreadsheets)}</li>
            <li>{t(i18nKeys.landing.problem.whatsapp)}</li>
            <li>{t(i18nKeys.landing.problem.receipts)}</li>
          </ul>
        </div>
      </section>

      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '8px 24px 40px',
        }}
      >
        <h2 style={{ fontSize: '22px', marginBottom: '16px' }}>
          {t(i18nKeys.landing.solution.title)}
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            t(i18nKeys.landing.solution.events),
            t(i18nKeys.landing.solution.tuitions),
            t(i18nKeys.landing.solution.oneOff),
            t(i18nKeys.landing.solution.communication),
            t(i18nKeys.landing.solution.finance),
          ].map((text) => (
            <div
              key={text}
              style={{
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                background: '#ffffff',
                fontSize: '14px',
                color: '#475569',
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </section>

      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px 40px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px' }}>
          {t(i18nKeys.landing.proof.title)}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b' }}>{t(i18nKeys.landing.proof.subtitle)}</p>
      </section>

      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px 40px 24px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: '20px', marginTop: '24px', marginBottom: '8px' }}>
          {t(i18nKeys.landing.finalCta.title)}
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
          {t(i18nKeys.landing.finalCta.subtitle)}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <Link href={loginHref}>
            <button
              style={{
                padding: '10px 20px',
                fontSize: '15px',
                cursor: 'pointer',
                borderRadius: '999px',
                border: 'none',
                background: '#2563eb',
                color: '#ffffff',
              }}
            >
              {t(i18nKeys.landing.buttons.login)}
            </button>
          </Link>
          <Link href={demoHref}>
            <button
              style={{
                padding: '10px 20px',
                fontSize: '15px',
                cursor: 'pointer',
                borderRadius: '999px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0f172a',
              }}
            >
              {t(i18nKeys.landing.buttons.demo)}
            </button>
          </Link>
        </div>
      </section>
    </main>
  );
}
