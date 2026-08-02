import type { Metadata } from 'next';
import { privacyDocument } from '@/content/legal/privacy';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import type { AppLocale } from '@/i18n/routing';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Yowyob Education',
};

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const doc = privacyDocument[locale as AppLocale] ?? privacyDocument.fr;
  return <LegalDocumentView doc={doc} />;
}
