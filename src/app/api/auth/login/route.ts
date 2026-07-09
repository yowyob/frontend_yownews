import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, orgDisplayName, savePendingLogin } from '@/server/login-pending';

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
    const contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);

    const session = buildSession(contextual);
    await writeSession(session);

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
