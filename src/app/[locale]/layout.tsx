import type { Metadata } from 'next';
import { Sora, Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SessionProvider } from '@/components/providers/session-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { readSession } from '@/server/session';
import type { ClientSession } from '@/lib/types/auth';
const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YowNews. Apprenez. Explorez. Grandissez.',
  description: 'La plateforme éducative camerounaise qui réunit blogs, podcasts et cours.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  let initialSession: ClientSession | null = null;
  try {
    const session = await readSession();
    if (session) {
      initialSession = {
        user: session.user,
        workspace: session.workspace,
        forcePasswordChange: session.forcePasswordChange ?? false,
        expiresAt: session.expiresAt,
      };
    }
  } catch {
    // Redis not available in dev without backend — graceful fallback
  }

  return (
    <html lang={locale} className={`${sora.variable} ${jakarta.variable}`} data-scroll-behavior="smooth">
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            <SessionProvider initialSession={initialSession}>
              {children}
            </SessionProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
