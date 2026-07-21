import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { updateEmployeeRole, removeEmployee } from '@/server/ksm/modules/employees';
import { findRoleIdByCode } from '@/server/ksm/modules/administration';
import { orgOperationSession } from '@/server/ksm/admin-session';
import { isOrganizationManager } from '@/lib/roles';
import { isRoleAssignable } from '@/lib/org-roles';

/** Modifie le rôle d'un employé déjà membre de l'organisation active. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isOrganizationManager(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation de modifier les rôles.");
    }

    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation active sélectionnée.");
    }

    const { id } = await params;
    const body = (await request.json()) as { roleCode?: string };
    const roleCode = String(body.roleCode ?? '').trim();
    // Rôle unique, borné par les services souscrits de l'org.
    if (!isRoleAssignable(roleCode, session.workspace?.services)) {
      return fail(400, 'VALIDATION_ERROR', "Ce rôle n'est pas attribuable pour cette organisation (service non souscrit).");
    }

    const adminSession = await orgOperationSession(session);
    if (!adminSession) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');

    const roleId = await findRoleIdByCode(adminSession, orgId, roleCode);
    if (!roleId) return fail(404, 'ROLE_NOT_FOUND', `Rôle ${roleCode} introuvable pour cette organisation.`);

    const updated = await updateEmployeeRole(adminSession, orgId, id, roleId);
    return ok(updated);
  });
}

/** Retire un employé de l'organisation active. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isOrganizationManager(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation de retirer des membres.");
    }

    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation active sélectionnée.");
    }

    const adminSession = await orgOperationSession(session);
    if (!adminSession) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');

    const { id } = await params;
    await removeEmployee(adminSession, orgId, id);
    return ok({ success: true });
  });
}
