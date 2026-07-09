import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import { isEducationEditor } from '@/lib/roles';
import ProfileClient from './ProfileClient';

export default async function ReaderProfilePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const authorities = session.user.permissions ?? session.user.roles;
  const isEditor = isEducationEditor(authorities);
  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  return (
    <ProfileClient
      displayName={displayName}
      email={session.user.email}
      view={isEditor ? 'editor' : 'reader'}
      roleLabel={isEditor ? 'Rédacteur' : 'Lecteur'}
      blogHref="/editor/blog"
    />
  );
}
