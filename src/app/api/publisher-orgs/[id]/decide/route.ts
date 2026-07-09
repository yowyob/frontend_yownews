import 'server-only';
import { type NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { decideRequest } from '@/server/ksm/modules/publisher-orgs';
import { isPlatformAdmin } from '@/lib/roles';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return authenticatedRoute(async (session) => {
    const authorities = session.user.permissions ?? session.user.roles;
    if (!isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', "Vous n'avez pas l'autorisation de decider du statut d'une organisation.");
    }

    const { id } = await params;
    const body = (await request.json()) as {
      status?: string;
    };

    const status = String(body.status ?? '').trim().toUpperCase();
    if (!status || !['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'].includes(status)) {
      return fail(400, 'VALIDATION_ERROR', "Statut invalide.");
    }

    const updated = await decideRequest(session, id, status as any);
    return ok(updated);
  });
}
