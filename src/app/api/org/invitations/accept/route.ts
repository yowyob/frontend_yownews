import 'server-only';
import type { NextRequest } from 'next/server';
import { HttpError } from '@/lib/types/api';
import { handleRoute, fail } from '@/server/api-response';
import { getAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { acceptInvitation } from '@/server/ksm/modules/employees';
import { logger } from '@/server/logger';

// POST /api/org/invitations/accept { token } — acceptation d'une invitation (lien reçu par email).
// Public (pas de session utilisateur) : le token est la seule preuve. Le endpoint KSM exige le
// contexte tenant → on le fournit via la session admin (tenant plateforme). Fait passer l'adhésion
// PENDING → ACTIVE.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { token?: string };
    const token = String(body.token ?? '').trim();
    if (!token) return fail(400, 'VALIDATION_ERROR', 'token is required');

    const admin = await getAdminSession();
    if (!admin) return fail(503, 'ADMIN_UNAVAILABLE', 'Service indisponible, réessayez plus tard.');
    const tenantId = admin.workspace?.tenantId ?? admin.user.tenantId;
    if (!tenantId) return fail(500, 'TENANT_UNRESOLVED', 'Contexte tenant introuvable.');
    const orgId = await resolvePlatformOrganizationId();
    if (!orgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation Yowyob Education introuvable.');

    try {
      await acceptInvitation(tenantId, orgId, token);
    } catch (err) {
      // Jeton inconnu, déjà consommé, révoqué ou expiré : KSM répond de façon volontairement opaque.
      if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
        return fail(400, 'INVITATION_INVALID', 'Ce lien d’invitation est invalide ou a expiré.');
      }
      logger.error({ err }, 'org.invitations.accept_failed');
      throw err;
    }

    return { accepted: true as const };
  });
}
