import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumListPage from './ForumListPage';

export default async function ForumsPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <ForumListPage />;
}
