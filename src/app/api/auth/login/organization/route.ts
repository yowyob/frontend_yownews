import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { orgDisplayName } from '@/server/login-pending';
import { activateOrganizationWorkspace, ORG_MODE_REQUIRED_SERVICES } from '@/server/ksm/org-activation';
import { saveOrgLoginPending, type OrgLoginOrganization } from '@/server/org-login-pending';
import { getAdminSession } from '@/server/ksm/admin-session';
import type { AppSession } from '@/lib/types/auth';

/**
 * Connexion "mode organisation" : identifiants d'un owner ou d'un employé KSM potentiellement
 * distinct du compte lecteur en cours (organisation externe, pas forcément créée via yownews).
 * La liste d'organisations vient de `discover-contexts`, qui fusionne déjà côté KSM les orgs
 * possédées (business actor owner) ET les orgs où le compte est simple employé
 * (`UserOrganizationAccessDirectory.listUserOrganizations` = owned ∪ member) — un employé invité
 * peut donc se connecter en mode organisation, pas seulement le owner. Renvoie soit un accès
 * direct (1 seule org, déjà souscrite), soit une étape de sélection d'org (plusieurs org
 * accessibles), soit une redirection souscription (aucune org souscrite).
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { email?: string; password?: string };
    const principal = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!principal || !password) {
      return fail(400, 'VALIDATION_ERROR', 'email and password are required');
    }

    const discovery = await authApi.discoverContexts(principal, password);
    if (!discovery.contexts.length) {
      return fail(401, 'INVALID_CREDENTIALS', 'Adresse email ou mot de passe incorrect.');
    }

    const ctx = discovery.contexts[0];
    const contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, undefined);
    const s = contextual.session;

    // Le mode organisation est réservé aux comptes d'un tenant DÉDIÉ à une organisation. Un compte du
    // tenant de la plateforme (admin .env.local, freelances, lecteurs) n'a rien à y faire : sinon le
    // contenu de la plateforme fuiterait dans l'espace org (isolation stricte par tenant). On rejette
    // donc tout login org dont le tenant est celui de l'admin plateforme.
    const adminSession = await getAdminSession();
    const platformTenantId = adminSession?.user.tenantId ?? adminSession?.workspace?.tenantId;
    if (platformTenantId && contextual.selectedTenantId === platformTenantId) {
      return fail(403, 'ORG_MODE_NOT_ALLOWED', "Le mode organisation n'est pas disponible pour les comptes de la plateforme. Connectez-vous avec un compte d'organisation dédié (tenant propre).");
    }
    const ownerSession: AppSession = {
      sid: crypto.randomUUID(),
      accessToken: s.accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + s.expiresInSeconds,
      forcePasswordChange: s.forcePasswordChange,
      user: {
        id: s.id,
        tenantId: contextual.selectedTenantId,
        email: s.email,
        username: s.username,
        firstName: s.firstName ?? undefined,
        lastName: s.lastName ?? undefined,
        roles: s.authorities,
        permissions: s.authorities,
      },
      workspace: { tenantId: contextual.selectedTenantId },
    };

    // `ctx.organizations` (fourni par discover-contexts, avant même select-context) porte déjà la
    // fusion owned+member — aucun appel KSM supplémentaire nécessaire.
    if (!ctx.organizations.length) {
      return fail(404, 'NO_ORGANIZATION_ACCESS', "Ce compte n'est ni propriétaire ni employé d'aucune organisation.");
    }

    const organizations: OrgLoginOrganization[] = ctx.organizations.map((o) => ({
      organizationId: o.organizationId,
      code: o.organizationCode ?? o.organizationId,
      services: o.services ?? [],
      displayName: orgDisplayName(o),
    }));
    // Propagé à la session finale (activateOrganizationWorkspace spreads ownerSession) — sert au
    // switch d'org en session, y compris via les étapes sélection/souscription (pending stocke
    // ownerSession tel quel).
    ownerSession.accessibleOrganizations = organizations;

    if (organizations.length > 1) {
      const pendingId = await saveOrgLoginPending({ ownerSession, organizations });
      return {
        requiresOrgSelection: true as const,
        pendingId,
        organizations,
      };
    }

    const result = await activateOrganizationWorkspace(ownerSession, organizations[0]);
    if (!result.subscribed) {
      const pendingId = await saveOrgLoginPending({ ownerSession, organizations });
      return {
        requiresSubscription: true as const,
        pendingId,
        organization: organizations[0],
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
