import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import { getAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { removeEmployee } from '@/server/ksm/modules/employees';

// DELETE /api/admin/members/{membershipId} — « Retirer de l'org » : supprime l'adhésion du membre à
// l'organisation plateforme (via l'identité admin). Le compte KSM subsiste ; il perd juste son
// appartenance à l'org (et le rôle associé).
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ membershipId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { membershipId } = await params;
    const admin = await getAdminSession();
    if (!admin) return fail(503, 'ADMIN_UNAVAILABLE', 'Session admin indisponible.');
    const orgId = await resolvePlatformOrganizationId();
    if (!orgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation Yowyob Education introuvable.');

    await removeEmployee(admin, orgId, membershipId);
    return { success: true as const };
  });
}
