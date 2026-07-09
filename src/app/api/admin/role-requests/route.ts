import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import { listApplications } from '@/server/ksm/modules/editor-applications';

// GET /api/admin/role-requests — toutes les candidatures Rédacteur (admin).
// La page répartit en onglets (En attente / Validées) côté client.
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }
    return listApplications(session);
  });
}
