import 'server-only';
import type { NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { subscribeService } from '@/server/ksm/modules/organizations';
import { checkOrgSubscription, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';

/**
 * Souscrit un service requis à une organisation ACCESSIBLE à l'utilisateur courant (owned+member),
 * hors flux de login (contrairement à /api/auth/login/organization/subscribe, lié à un pendingId
 * Redis) — utilisé par le sélecteur d'organisation quand un switch échoue faute de souscription.
 */
export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const body = (await request.json()) as { organizationId?: string; serviceCode?: string };
    const organizationId = String(body.organizationId ?? '');
    const serviceCode = String(body.serviceCode ?? '').toUpperCase();

    if (!organizationId || !serviceCode) {
      return fail(400, 'VALIDATION_ERROR', 'organizationId and serviceCode are required');
    }
    if (!(ORG_MODE_REQUIRED_SERVICES as readonly string[]).includes(serviceCode)) {
      return fail(400, 'VALIDATION_ERROR', 'serviceCode invalide.');
    }

    const org = (session.accessibleOrganizations ?? []).find((o) => o.organizationId === organizationId);
    if (!org) {
      return fail(403, 'ORG_NOT_ALLOWED', "Vous n'avez pas accès à cette organisation.");
    }

    await subscribeService(session, organizationId, serviceCode);
    const check = await checkOrgSubscription(organizationId);

    return ok({ subscribed: check.subscribed, effectiveServices: check.effectiveServices });
  });
}
