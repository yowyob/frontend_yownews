import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumGroupView from './ForumGroupView';

export default async function ForumGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  const { groupId } = await params;
  return <ForumGroupView groupId={groupId} userId={session.user.id} />;
}
