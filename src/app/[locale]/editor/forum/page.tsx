import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import MyForumsWorkspace from '@/components/forum/MyForumsWorkspace';
import { isOrgAdmin, isPlatformAdmin } from '@/lib/roles';

export default async function EditorForumPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  // Mode organisation → l'owner peut choisir le type de forum (public / communauté / sur demande).
  const authorities = session.user.permissions ?? session.user.roles;
  const orgMode = isOrgAdmin(authorities) && !isPlatformAdmin(authorities);
  return <MyForumsWorkspace userId={session.user.id} orgMode={orgMode} />;
}
