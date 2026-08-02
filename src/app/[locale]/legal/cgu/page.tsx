import type { Metadata } from 'next';
import { cguDocument } from '@/content/legal/cgu';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Conditions générales d’utilisation — Yowyob Education',
};

export default async function CguPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const doc = cguDocument[locale as AppLocale] ?? cguDocument.fr;
  return <LegalDocumentView doc={doc} />;
}
