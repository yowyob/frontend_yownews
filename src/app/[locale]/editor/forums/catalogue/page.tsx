import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumCatalogue from '@/components/forum/ForumCatalogue';

export default async function EditorForumCataloguePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  return <ForumCatalogue userId={session.user.id} />;
}
