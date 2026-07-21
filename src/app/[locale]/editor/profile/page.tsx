import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import { roleBadgeLabelForVariant, variantForMode } from '@/lib/roles';
import ProfileClient from '../../reader/profile/ProfileClient';

// Profil Rédacteur/Admin : onglet Posts + accès à l'espace de rédaction. Badge et bannière
// « Devenir Rédacteur » dépendent du mode (org vs freelance) — cf. variantForMode.
export default async function EditorProfilePage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  const authorities = session.user.permissions ?? session.user.roles;
  const orgMode = session.workspace?.orgMode === true;
  const variant = variantForMode(authorities, orgMode);

  return <ProfileClient displayName={displayName} email={session.user.email} view="editor" roleLabel={roleBadgeLabelForVariant(variant)} orgMode={orgMode} blogHref="/editor/blog" />;
}
