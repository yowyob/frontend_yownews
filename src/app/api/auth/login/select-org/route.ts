import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, takePendingLogin } from '@/server/login-pending';

/**
 * Finalise un login multi-organisations : le client renvoie le pendingId opaque
 * + l'org choisie. L'appartenance est vérifiée ici (liste stockée en Redis) puis
 * revalidée nativement par KSM dans select-context (validateOrganizationAccess).
 */
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { pendingId?: string; organizationId?: string };
    const pendingId = String(body.pendingId ?? '');
    const organizationId = String(body.organizationId ?? '');

    if (!pendingId || !organizationId) {
      return fail(400, 'VALIDATION_ERROR', 'pendingId and organizationId are required');
    }

    const pending = await takePendingLogin(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'Login step expired, please sign in again.');
    }

    if (!pending.organizations.some((o) => o.organizationId === organizationId)) {
      return fail(403, 'ORG_NOT_ALLOWED', 'You do not have access to this organization.');
    }

    const contextual = await authApi.selectContext(pending.selectionToken, pending.contextId, organizationId);

    const session = buildSession(contextual);
    await writeSession(session);

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
