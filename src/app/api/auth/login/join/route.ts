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
// Invite le compte comme EMPLOYÉ de l'org plateforme (rôle lecteur), via l'identité admin (owner de
// l'org). L'org apparaît alors dans ses organisations → à la reconnexion il entre normalement.
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
      // Déjà employé (409) → succès idempotent : le compte fait déjà partie de l'org.
      if (err instanceof HttpError && err.status === 409) {
        return { joined: true as const };
      }
      logger.error({ err, email: pending.email }, 'auth.login.join_failed');
      throw err;
    }

    return { joined: true as const };
  });
}
