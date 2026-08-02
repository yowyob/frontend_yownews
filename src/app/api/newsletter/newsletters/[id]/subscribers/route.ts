import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import { isPlatformAdmin } from '@/lib/roles';

// GET /api/newsletter/newsletters/[id]/subscribers — qui recevrait un e-mail au prochain
// contenu publié (union catégories + rédacteur + abonnés directs). L'admin voit n'importe
// quelle newsletter, le rédacteur uniquement la sienne (vérifié côté backend).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const authorities = session.user.permissions ?? session.user.roles;
    if (isPlatformAdmin(authorities)) {
      return newsletterApi.listSubscribersAsAdmin(session, id);
    }
    return newsletterApi.listMySubscribers(session, id);
  });
}
