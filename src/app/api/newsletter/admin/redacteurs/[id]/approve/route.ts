import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import * as adminApi from '@/server/ksm/modules/administration';

// POST /api/newsletter/admin/redacteurs/{id}/approve — approuve la demande PUIS assigne le rôle
// KSM NEWSLETTER_EDITOR au compte (sans ça, l'approbation ne fait que changer un statut métier :
// l'utilisateur ne peut jamais réellement créer de newsletter, cf. newsletter:newsletter:create).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id } = await params;
    const approved = await newsletterApi.approveRedacteurRequest(session, id);

    const roles = await adminApi.listRoles(session);
    const newsletterEditorRoleId = roles.find((r) => r.code === adminApi.ROLE_CODE_NEWSLETTER_EDITOR)?.id;
    if (!newsletterEditorRoleId) return fail(500, 'ROLE_NOT_FOUND', 'Rôle NEWSLETTER_EDITOR introuvable.');

    const users = await adminApi.listTenantUsers(session);
    const applicant = users.find((u) => u.userId === approved.userId);
    const alreadyAssigned = applicant?.roles.some((r) => r.code === adminApi.ROLE_CODE_NEWSLETTER_EDITOR) ?? false;
    if (!alreadyAssigned) {
      await adminApi.assignRole(session, approved.userId, newsletterEditorRoleId);
    }

    return approved;
  });
}
