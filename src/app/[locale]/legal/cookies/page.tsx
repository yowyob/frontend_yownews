import type { Metadata } from 'next';
import { cookiesDocument } from '@/content/legal/cookies';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Notice cookies & publicité — Yowyob Education',
};

export default async function CookiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const doc = cookiesDocument[locale as AppLocale] ?? cookiesDocument.fr;
  return <LegalDocumentView doc={doc} />;
}
