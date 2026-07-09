import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ReaderNewsletterClient from './ReaderNewsletterClient';

export default async function ReaderNewsletterPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <ReaderNewsletterClient email={session.user.email} />;
}
