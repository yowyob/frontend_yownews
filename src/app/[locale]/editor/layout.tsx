import { redirect } from 'next/navigation';
import { readSession } from '@/server/session';
import { SessionProvider } from '@/components/providers/session-provider';
import { isEducationEditor, isPlatformAdmin, roleBadgeLabel, roleVariant } from '@/lib/roles';
import AdminSidebar from '../admin/_components/AdminSidebar';
import AdminTopbar from '../admin/_components/AdminTopbar';
import type { ClientSession } from '@/lib/types/auth';

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/auth/login');

  const authorities = session.user.permissions ?? session.user.roles;
  // L'éditeur accède à cet espace ; l'admin (superset) est toléré.
  if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) redirect('/');

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
        <AdminSidebar displayName={displayName} email={session.user.email} variant={roleVariant(authorities)} roleBadge={roleBadgeLabel(authorities)} />
        <div
          style={{ marginLeft: 'var(--sb-w, 260px)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto', transition: 'margin-left .3s ease' }}
          className="admin-main"
        >
          <AdminTopbar displayName={displayName} />
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
