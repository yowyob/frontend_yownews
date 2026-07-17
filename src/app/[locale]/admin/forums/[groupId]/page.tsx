import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumGroupView from '@/components/forum/ForumGroupView';

// Ouvrir un forum depuis l'espace admin sans quitter cet espace (le lien vient du panneau
// « Forums de la communauté » de MyForumsWorkspace, préfixé par AppLink selon le variant).
export default async function ForumGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  const { groupId } = await params;
  return <ForumGroupView groupId={groupId} userId={session.user.id} />;
}
