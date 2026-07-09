import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import ProfileClient from '../../reader/profile/ProfileClient';

// Profil Admin : même vue que le Rédacteur (onglet Posts), badge « Administrateur ».
export default async function AdminProfilePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  return <ProfileClient displayName={displayName} email={session.user.email} view="editor" roleLabel="Administrateur" blogHref="/admin/blogs" />;
}
