import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import NewslettersAdminWorkspace from './NewslettersAdminWorkspace';

export default async function AdminNewslettersPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <NewslettersAdminWorkspace email={session.user.email} />;
}
