import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { takeOrgLoginPending, saveOrgLoginPending } from '@/server/org-login-pending';
import { activateOrganizationWorkspace, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { pendingId?: string; organizationId?: string };
    const pendingId = String(body.pendingId ?? '');
    const organizationId = String(body.organizationId ?? '');

    if (!pendingId || !organizationId) {
      return fail(400, 'VALIDATION_ERROR', 'pendingId and organizationId are required');
    }

    const pending = await takeOrgLoginPending(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'La session de connexion a expiré. Veuillez vous reconnecter.');
    }

    const org = pending.organizations.find((o) => o.organizationId === organizationId);
    if (!org) {
      return fail(403, 'ORG_NOT_ALLOWED', "Vous ne possédez pas cette organisation.");
    }

    const result = await activateOrganizationWorkspace(pending.ownerSession, org);
    if (!result.subscribed) {
      // Nouveau pendingId : celui d'origine vient d'être consommé (takeOrgLoginPending).
      const newPendingId = await saveOrgLoginPending(pending);
      return {
        requiresSubscription: true as const,
        pendingId: newPendingId,
        organization: org,
        requiredServices: ORG_MODE_REQUIRED_SERVICES,
        effectiveServices: result.effectiveServices,
      };
    }

    return {
      user: result.session.user,
      workspace: result.session.workspace,
    };
  });
}
