import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import type { StatutNewsletter } from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/contents?statut= — file de modération des CONTENUS (admin).
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const statut = request.nextUrl.searchParams.get('statut') as StatutNewsletter | null;
    if (!statut) return fail(400, 'VALIDATION_ERROR', 'statut is required');
    return newsletterApi.listContentsByStatut(session, statut);
  });
}
