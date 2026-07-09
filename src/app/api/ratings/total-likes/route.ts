import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as ratingsApi from '@/server/ksm/modules/ratings';

// GET /api/ratings/total-likes?entityId= — compteur seul, pour affichage lecture-seule (cartes de feed).
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const entityId = request.nextUrl.searchParams.get('entityId');
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');

    return ratingsApi.getTotalLikes(session, entityId);
  });
}
