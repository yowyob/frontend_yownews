import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { listEmployees, inviteEmployee } from '@/server/ksm/modules/employees';
import { findRoleIdByCode } from '@/server/ksm/modules/administration';
import { getAdminSession } from '@/server/ksm/admin-session';
import { isOrganizationManager } from '@/lib/roles';

/** Rôles "employé" assignables par un owner d'organisation à l'invitation. */
const INVITABLE_ROLE_CODES = ['EDUCATION_EDITOR_PERMISSIONS', 'NEWSLETTER_EDITOR', 'FORUM_USER_PERMISSIONS'];

export async function GET() {
  return authenticatedRoute(async (session) => {
    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation active sélectionnée.");
    }

    const adminSession = await getAdminSession();
    if (!adminSession) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');

    const employees = await listEmployees(adminSession, orgId);
    return ok(employees);
  });
}

export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isOrganizationManager(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation d'inviter des membres.");
    }

    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation active sélectionnée.");
    }

    const body = (await request.json()) as { email?: string; roleCode?: string };
    const email = String(body.email ?? '').trim();
    const roleCode = String(body.roleCode ?? '').trim();

    if (!email) return fail(400, 'VALIDATION_ERROR', "L'adresse email est requise.");
    if (!INVITABLE_ROLE_CODES.includes(roleCode)) {
      return fail(400, 'VALIDATION_ERROR', 'roleCode invalide.');
    }

    const adminSession = await getAdminSession();
    if (!adminSession) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');

    const roleId = await findRoleIdByCode(adminSession, orgId, roleCode);
    if (!roleId) return fail(404, 'ROLE_NOT_FOUND', `Rôle ${roleCode} introuvable pour cette organisation.`);

    const invited = await inviteEmployee(adminSession, orgId, { email, roleId });
    return ok(invited, { status: 201 });
  });
}
