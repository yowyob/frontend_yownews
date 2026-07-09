import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { listEmployees, inviteEmployee } from '@/server/ksm/modules/publisher-orgs';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';

export async function GET(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation externe active selectionnee.");
    }

    const employees = await listEmployees(session, orgId);
    return ok(employees);
  });
}

export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    // Only organization owners/editors or platform admins can invite
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation d'inviter des membres.");
    }

    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Aucune organisation externe active selectionnee.");
    }

    const body = (await request.json()) as {
      email?: string;
    };

    const email = String(body.email ?? '').trim();
    if (!email) {
      return fail(400, 'VALIDATION_ERROR', "L'adresse email est requise.");
    }

    const defaultPermissions = [
      'education:content:create',
      'education:content:read',
      'education:podcasts:write',
      'education:podcasts:create',
      'education:podcasts:read',
      'education:courses:create',
      'education:courses:read',
      'education:courses:write',
      'newsletter:newsletter:create',
      'newsletter:newsletter:read',
    ];

    const invited = await inviteEmployee(session, orgId, email, defaultPermissions);
    return ok(invited, { status: 201 });
  });
}
