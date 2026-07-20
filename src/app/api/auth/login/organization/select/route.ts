import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { peekOrgLoginPending, takeOrgLoginPending } from '@/server/org-login-pending';
import { activateOrganizationWorkspace, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { pendingId?: string; organizationId?: string };
    const pendingId = String(body.pendingId ?? '');
    const organizationId = String(body.organizationId ?? '');

    if (!pendingId || !organizationId) {
      return fail(400, 'VALIDATION_ERROR', 'pendingId and organizationId are required');
    }

    // `peek` et non `take` : consommer le pending AVANT l'activation le détruisait dès le moindre
    // échec, si bien que la nouvelle tentative de l'utilisateur échouait pour une autre raison
    // (pending introuvable) avec le même message « session expirée » — ce qui masquait l'erreur
    // réelle. On ne consomme qu'après succès, comme le fait déjà `subscribe/route.ts`.
    const pending = await peekOrgLoginPending(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'La session de connexion a expiré. Veuillez vous reconnecter.');
    }

    const org = pending.organizations.find((o) => o.organizationId === organizationId);
    if (!org) {
      return fail(403, 'ORG_NOT_ALLOWED', "Vous ne possédez pas cette organisation.");
    }

    const result = await activateOrganizationWorkspace(pending.ownerSession, org);
    if (!result.subscribed) {
      // Le pending n'a pas été consommé : l'écran de souscription réutilise le même identifiant.
      return {
        requiresSubscription: true as const,
        pendingId,
        organization: org,
        requiredServices: ORG_MODE_REQUIRED_SERVICES,
        effectiveServices: result.effectiveServices,
      };
    }

    await takeOrgLoginPending(pendingId);

    return {
      user: result.session.user,
      workspace: result.session.workspace,
    };
  });
}
