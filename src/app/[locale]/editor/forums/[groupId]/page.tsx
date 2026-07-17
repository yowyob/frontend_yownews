import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import ForumGroupView from '@/components/forum/ForumGroupView';

// Pluriel « forums » : c'est le chemin que produit AppLink (`/forums/{id}` préfixé par le variant).
// Le lien de navigation de l'espace rédacteur reste `/editor/forum` (singulier) pour la liste.
export default async function ForumGroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  const { groupId } = await params;
  return <ForumGroupView groupId={groupId} userId={session.user.id} />;
}
