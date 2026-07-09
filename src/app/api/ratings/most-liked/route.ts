import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as ratingsApi from '@/server/ksm/modules/ratings';
import type { EntityType } from '@/server/ksm/modules/ratings';

// GET /api/ratings/most-liked?entityType= — contenu (UUID) ayant le plus de likes.
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const entityType = request.nextUrl.searchParams.get('entityType') as EntityType | null;
    return ratingsApi.getMostLiked(session, entityType ?? undefined);
  });
}
