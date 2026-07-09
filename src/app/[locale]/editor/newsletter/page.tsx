import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import NewsletterWorkspace from './NewsletterWorkspace';

export default async function EditorNewsletterPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <NewsletterWorkspace email={session.user.email} />;
}
