import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { peekOrgLoginPending, takeOrgLoginPending, saveOrgLoginPending } from '@/server/org-login-pending';
import { subscribeService } from '@/server/ksm/modules/organizations';
import { activateOrganizationWorkspace, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';

/**
 * Écran "gestion des orgs et actors" (souscription) : l'owner souscrit un des services requis
 * pour son organisation, puis on retente l'activation du workspace.
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as {
      pendingId?: string;
      organizationId?: string;
      serviceCode?: string;
    };
    const pendingId = String(body.pendingId ?? '');
    const organizationId = String(body.organizationId ?? '');
    const serviceCode = String(body.serviceCode ?? '').toUpperCase();

    if (!pendingId || !organizationId || !serviceCode) {
      return fail(400, 'VALIDATION_ERROR', 'pendingId, organizationId and serviceCode are required');
    }
    if (!(ORG_MODE_REQUIRED_SERVICES as readonly string[]).includes(serviceCode)) {
      return fail(400, 'VALIDATION_ERROR', 'serviceCode invalide.');
    }

    const pending = await peekOrgLoginPending(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'La session de connexion a expiré. Veuillez vous reconnecter.');
    }
    const org = pending.organizations.find((o) => o.organizationId === organizationId);
    if (!org) {
      return fail(403, 'ORG_NOT_ALLOWED', "Vous ne possédez pas cette organisation.");
    }

    await subscribeService(pending.ownerSession, organizationId, serviceCode);

    await takeOrgLoginPending(pendingId);
    const result = await activateOrganizationWorkspace(pending.ownerSession, org);
    if (!result.subscribed) {
      // Ne devrait pas arriver juste après une souscription réussie ; dégradation propre.
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
