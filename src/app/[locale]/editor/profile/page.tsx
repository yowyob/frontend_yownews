import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import ProfileClient from '../../reader/profile/ProfileClient';

// Profil Rédacteur : onglet Posts + accès à l'espace Rédacteur.
export default async function EditorProfilePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  return <ProfileClient displayName={displayName} email={session.user.email} view="editor" roleLabel="Rédacteur" blogHref="/editor/blog" />;
}
