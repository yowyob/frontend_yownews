import { readSession } from '@/server/session';
import { redirect } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/roles';
import RedacteursWorkspace from './RedacteursWorkspace';

export default async function NewsletterRedacteursPage() {
  const session = await readSession();
  if (!session) redirect('/auth/login');
  if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) redirect('/admin/newsletters');

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>
        Rédacteurs & Abonnements
      </h1>
      <RedacteursWorkspace />
    </div>
  );
}
