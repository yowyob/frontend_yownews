import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import { getAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees } from '@/server/ksm/modules/employees';

// GET /api/admin/members — membres de l'organisation plateforme (adhésions), pour la liste admin
// « Utilisateurs ». Remplace l'ancienne liste tenant-wide : seuls les comptes INVITÉS (ayant une
// adhésion) apparaissent, avec leur statut réel (PENDING/ACTIVE). Les REMOVED sont exclus.
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const admin = await getAdminSession();
    if (!admin) return fail(503, 'ADMIN_UNAVAILABLE', 'Session admin indisponible.');
    const orgId = await resolvePlatformOrganizationId();
    if (!orgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation Yowyob Education introuvable.');

    const members = await listEmployees(admin, orgId);
    return members.filter((m) => m.status !== 'REMOVED');
  });
}
