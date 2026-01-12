import { I18nProvider } from '../i18n/provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <I18nProvider locale="pt">{children}</I18nProvider>
      </body>
    </html>
  );
}
