import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { orgOperationSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees, updateEmployeePhoto } from '@/server/ksm/modules/employees';
import { uploadFile } from '@/server/ksm/modules/files';

// POST /api/profile/photo — l'utilisateur connecté renseigne sa propre photo de profil d'employé.
// PUT /api/employees/{id} exige côté KSM une identité admin/owner (OrganizationAdministratorOnly) :
// on appelle donc via une identité élevée (orgOperationSession), mais on restreint la cible à la
// propre adhésion de l'appelant (userId === session.user.id) — même schéma best-effort déjà utilisé
// pour la résolution de nom (cf. /api/users/[id]/name, /api/users/[id]/profile).
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', 'file is required');

    const orgId = session.workspace?.orgMode && session.workspace.organizationId
      ? session.workspace.organizationId
      : await resolvePlatformOrganizationId();
    if (!orgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation introuvable.');

    const adminSession = await orgOperationSession(session);
    if (!adminSession) return fail(503, 'ADMIN_UNAVAILABLE', 'Session admin indisponible.');

    const employees = await listEmployees(adminSession, orgId);
    const mine = employees.find((e) => e.userId === session.user.id);
    if (!mine) return fail(404, 'MEMBERSHIP_NOT_FOUND', "Aucune adhésion trouvée pour cet utilisateur.");

    const forward = new FormData();
    forward.append('file', file, file.name);
    const uploaded = await uploadFile(session, forward);

    await updateEmployeePhoto(adminSession, orgId, mine.id, uploaded.id);
    return { photoId: uploaded.id };
  });
}
