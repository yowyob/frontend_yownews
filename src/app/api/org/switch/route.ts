import 'server-only';
import type { NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { patchSession } from '@/server/session';
import { checkOrgSubscription, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';

/**
 * Change l'organisation active de la session courante, sans re-login : le token de la session
 * (`accessToken`) est tenant-scope et porte déjà les permissions de toutes les orgs accessibles
 * (owned+member), résolues au login (cf. `accessibleOrganizations`) — changer d'org revient donc à
 * changer le header `X-Organization-Id` envoyé à KSM sur les requêtes suivantes (`callKsm` le lit
 * depuis `session.workspace.organizationId`), pas à ré-authentifier. `patchSession` réécrit le
 * `workspace` de la session EN PLACE (même `sid`), contrairement à `activateOrganizationWorkspace`
 * (login) qui émet un nouveau `sid`.
 */
export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const body = (await request.json()) as { organizationId?: string };
    const organizationId = String(body.organizationId ?? '');
    if (!organizationId) {
      return fail(400, 'VALIDATION_ERROR', 'organizationId is required');
    }

    const org = (session.accessibleOrganizations ?? []).find((o) => o.organizationId === organizationId);
    if (!org) {
      return fail(403, 'ORG_NOT_ALLOWED', "Vous n'avez pas accès à cette organisation.");
    }

    // Services connus depuis le login (discover-contexts) : source primaire, pour ne pas relire via
    // l'admin plateforme (impossible si l'org est dans un tenant dédié). Repli : session de l'appelant.
    const knownServices = org.services ?? [];
    const check = knownServices.length > 0
      ? { subscribed: ORG_MODE_REQUIRED_SERVICES.some((c) => knownServices.includes(c)), effectiveServices: knownServices }
      : await checkOrgSubscription(org.organizationId, session);
    if (!check.subscribed) {
      return ok({
        requiresSubscription: true as const,
        organization: org,
        requiredServices: ORG_MODE_REQUIRED_SERVICES,
        effectiveServices: check.effectiveServices,
      });
    }

    // Conserve le marqueur de mode (le switch d'org se fait en restant dans le même mode) et
    // met à jour les services souscrits de la nouvelle org.
    const orgMode = session.workspace?.orgMode;
    const services = check.effectiveServices;
    await patchSession({
      workspace: {
        tenantId: session.workspace?.tenantId ?? session.user.tenantId ?? '',
        organizationId: org.organizationId,
        organizationCode: org.code,
        organizationName: org.displayName,
        orgMode,
        services,
      },
    });

    return ok({
      workspace: {
        tenantId: session.workspace?.tenantId ?? session.user.tenantId ?? '',
        organizationId: org.organizationId,
        organizationCode: org.code,
        organizationName: org.displayName,
        orgMode,
        services,
      },
    });
  });
}
