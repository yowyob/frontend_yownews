import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { requestPublisherStatus, listRequests } from '@/server/ksm/modules/publisher-orgs';
import { isPlatformAdmin } from '@/lib/roles';

export async function POST(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const orgId = session.workspace?.organizationId;
    const isPlatformOrg = session.workspace?.organizationCode === process.env.KSM_PLATFORM_ORG_CODE;
    if (!orgId || isPlatformOrg) {
      return fail(400, 'NO_ORGANIZATION', "Vous devez selectionner une organisation externe pour faire cette demande.");
    }

    const body = (await request.json()) as {
      orgCode?: string;
      displayName?: string;
    };

    const orgCode = String(body.orgCode ?? '').trim();
    const displayName = String(body.displayName ?? '').trim();

    if (!orgCode) {
      return fail(400, 'VALIDATION_ERROR', "Le code de l'organisation est requis.");
    }

    const created = await requestPublisherStatus(session, {
      orgId,
      orgCode,
      displayName,
    });
    return ok(created, { status: 201 });
  });
}

export async function GET(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation de lister les demandes.");
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;

    const list = await listRequests(session, status);
    return ok(list);
  });
}
