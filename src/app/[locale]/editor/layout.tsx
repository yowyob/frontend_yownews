import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import { SessionProvider } from '@/components/providers/session-provider';
import { hasEducationRole, hasForumRole, isEducationEditor, isOrgAdmin, isPlatformAdmin, roleBadgeLabelForVariant, variantForMode } from '@/lib/roles';
import { serverEnv } from '@/env';
import AdminSidebar from '../admin/_components/AdminSidebar';
import AdminTopbar from '../admin/_components/AdminTopbar';
import type { ClientSession } from '@/lib/types/auth';

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const authorities = session.user.permissions ?? session.user.roles;
  // Le mode organisation est porté par un marqueur de session explicite (login org), PAS déduit des
  // rôles — un freelance possède aussi les rôles MANAGER et ne doit pas être traité comme admin d'org.
  const orgMode = session.workspace?.orgMode === true;
  // Accès à l'espace éditeur : éditeur, admin plateforme, ou admin d'org (uniquement en mode org).
  if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities) && !(orgMode && isOrgAdmin(authorities))) redirect('/');

  const variant = variantForMode(authorities, orgMode);

  const clientSession: ClientSession = {
    user: session.user,
    workspace: session.workspace,
    forcePasswordChange: session.forcePasswordChange ?? false,
    expiresAt: session.expiresAt,
  };

  const displayName =
    [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.username || session.user.email;

  return (
    <SessionProvider initialSession={clientSession}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)', overflow: 'hidden' }}>
        <AdminSidebar displayName={displayName} email={session.user.email} variant={variant} roleBadge={roleBadgeLabelForVariant(variant)} orgMode={orgMode} hasEducation={hasEducationRole(authorities)} hasForum={hasForumRole(authorities)} />
        <div
          style={{ marginLeft: 'var(--sb-w, 260px)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto', transition: 'margin-left .3s ease' }}
          className="admin-main"
        >
          <AdminTopbar displayName={displayName} variant={variant} mockMode={serverEnv.MOCK_MODE} />
          <main style={{ flex: 1, padding: '28px 32px' }}>{children}</main>
        </div>
      </div>
      <style>{`
        @media(max-width:1024px){.admin-main{margin-left:64px!important}}
        @media(max-width:768px){.admin-main{margin-left:0!important;padding-bottom:60px}}
      `}</style>
    </SessionProvider>
  );
}
