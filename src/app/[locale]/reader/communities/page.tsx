import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import CommunityListPage from '@/components/forum/CommunityListPage';

export default async function CommunitiesPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <CommunityListPage />;
}
