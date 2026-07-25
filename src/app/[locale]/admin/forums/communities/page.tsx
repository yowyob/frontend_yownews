import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumModerationWorkspace from '../moderation/ForumModerationWorkspace';

export default async function AdminForumsCommunitiesPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <ForumModerationWorkspace kind="community" />;
}
