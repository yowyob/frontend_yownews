import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import * as adminApi from '@/server/ksm/modules/administration';

// POST /api/newsletter/admin/redacteurs/{id}/revoke — révoque le statut métier APPROVED (KSM)
// PUIS retire le rôle RBAC NEWSLETTER_EDITOR (sans ça, l'utilisateur garde le droit
// newsletter:newsletter:create malgré la révocation métier, cf. Bug 4).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id } = await params;
    const revoked = await newsletterApi.revokeRedacteurRequest(session, id);

    const users = await adminApi.listTenantUsers(session);
    const target = users.find((u) => u.userId === revoked.userId);
    const assignment = target?.roles.find((r) => r.code === adminApi.ROLE_CODE_NEWSLETTER_EDITOR);
    if (assignment) {
      await adminApi.revokeRole(session, revoked.userId, assignment.assignmentId);
    }

    return revoked;
  });
}
