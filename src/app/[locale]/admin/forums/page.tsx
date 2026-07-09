import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import MyForumsWorkspace from '@/components/forum/MyForumsWorkspace';

export default async function AdminForumsPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <MyForumsWorkspace userId={session.user.id} />;
}
