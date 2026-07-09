import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumModerationWorkspace from './ForumModerationWorkspace';

export default async function AdminForumsModerationPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <ForumModerationWorkspace />;
}
