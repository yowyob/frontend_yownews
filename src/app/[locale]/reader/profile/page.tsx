import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import { roleBadgeLabelForVariant, variantForMode } from '@/lib/roles';
import ProfileClient from './ProfileClient';

export default async function ReaderProfilePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const authorities = session.user.permissions ?? session.user.roles;
  const orgMode = session.workspace?.orgMode === true;
  const variant = variantForMode(authorities, orgMode);
  // Vue « éditeur » (posts) pour un rédacteur/admin/org ; « reader » (avec bannière) sinon.
  const isEditorView = orgMode || variant !== 'reader';
  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  return (
    <ProfileClient
      displayName={displayName}
      email={session.user.email}
      view={isEditorView ? 'editor' : 'reader'}
      roleLabel={roleBadgeLabelForVariant(variant)}
      orgMode={orgMode}
      blogHref="/editor/blog"
    />
  );
}
