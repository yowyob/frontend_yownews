import 'server-only';
import type { NextRequest } from 'next/server';
import { HttpError } from '@/lib/types/api';
import { handleRoute, fail } from '@/server/api-response';
import { takeJoinPending } from '@/server/login-pending';
import { getAdminSession, getReaderRoleId } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { inviteEmployee } from '@/server/ksm/modules/employees';
import { logger } from '@/server/logger';

// POST /api/auth/login/join { pendingId } — « Rejoindre Yowyob Education ».
// Émet une invitation dans l'org plateforme (via l'identité admin, propriétaire de l'org) : KSM crée
// l'adhésion et attribue immédiatement le rôle lecteur, puis envoie un email. Il suffit ensuite à
// l'utilisateur de se reconnecter — l'org apparaît alors dans ses accès et il entre.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { pendingId?: string };
    const pendingId = String(body.pendingId ?? '');
    if (!pendingId) return fail(400, 'VALIDATION_ERROR', 'pendingId is required');

    const pending = await takeJoinPending(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'La session de connexion a expiré. Veuillez vous reconnecter.');
    }

    const admin = await getAdminSession();
    if (!admin) return fail(503, 'ADMIN_UNAVAILABLE', 'Service indisponible, réessayez plus tard.');

    const [eduOrgId, readerRoleId] = await Promise.all([
      resolvePlatformOrganizationId(),
      getReaderRoleId(admin),
    ]);
    if (!eduOrgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation Yowyob Education introuvable.');

    try {
      await inviteEmployee(admin, eduOrgId, { email: pending.email, roleId: readerRoleId });
    } catch (err) {
      // Déjà invité/membre (409) → succès idempotent : l'accès est déjà en place.
      if (err instanceof HttpError && err.status === 409) {
        return { invited: true as const };
      }
      logger.error({ err, email: pending.email }, 'auth.login.join_failed');
      throw err;
    }

    return { invited: true as const };
  });
}
