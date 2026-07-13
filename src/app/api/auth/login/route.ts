import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, orgDisplayName, savePendingLogin } from '@/server/login-pending';
import { ensureFreelanceOrganization } from '@/server/ksm/freelance-org';
import { provisionOwnerRole } from '@/server/ksm/admin-session';
import { logger } from '@/server/logger';

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
      return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const ctx = discovery.contexts[0];
    const orgs = ctx.organizations ?? [];

    // Plusieurs organisations : étape « Choisir votre organisation » côté client.
    // Le selectionToken KSM reste en Redis ; seul un pendingId opaque sort.
    if (orgs.length > 1) {
      const pendingId = await savePendingLogin(
        { selectionToken: discovery.selectionToken, contextId: ctx.contextId, organizations: orgs },
        discovery.expiresInSeconds,
      );
      return {
        requiresOrgSelection: true as const,
        pendingId,
        organizations: orgs.map((o) => ({
          organizationId: o.organizationId,
          organizationCode: o.organizationCode,
          displayName: orgDisplayName(o),
        })),
      };
    }

    // 0 org (lecteur / staff plateforme) : fallback org plateforme inchangé.
    // 1 org : auto-sélection, validée nativement par KSM (validateOrganizationAccess).
    const orgId = orgs[0]?.organizationId ?? undefined;
    let contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);

    let session = buildSession(contextual);

    // 0 org à la connexion : ce compte n'a jamais eu l'occasion de recevoir le rôle OWNER
    // (le lien de vérification email pointe vers KSM lui-même, cf. IWM_AUTH_EMAIL_PUBLIC_BASE_URL
    // — le confirm route du BFF n'est donc jamais traversé en conditions réelles). On l'attribue
    // ici, puis on ré-obtient un token frais (même identifiants) pour que la tentative de
    // création d'org ci-dessous porte bien l'autorité tenant:admin fraîchement accordée —
    // un token déjà émis ne reflète jamais un rôle assigné après coup (cf. plan OWNER).
    if (orgs.length === 0) {
      await provisionOwnerRole(session.user.id);
      try {
        const refreshedDiscovery = await authApi.discoverContexts(principal, password);
        const refreshedCtx = refreshedDiscovery.contexts[0];
        if (refreshedCtx) {
          contextual = await authApi.selectContext(refreshedDiscovery.selectionToken, refreshedCtx.contextId, undefined);
          session = buildSession(contextual);
        }
      } catch (cause) {
        logger.error({ cause }, 'auth.login.owner_role_refresh_failed');
      }
    }

    await writeSession(session);

    // 0 org à la connexion : provisionne en tâche de fond une organisation freelance
    // pour ce lecteur (idempotent, best-effort — n'affecte jamais ce login).
    if (orgs.length === 0) {
      await ensureFreelanceOrganization(session, {
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        username: session.user.username,
      });
    }

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
