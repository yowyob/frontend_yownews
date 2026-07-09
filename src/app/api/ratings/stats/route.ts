import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as ratingsApi from '@/server/ksm/modules/ratings';

// GET /api/ratings/stats?entityId= — compteurs + état du like/dislike pour l'utilisateur courant.
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    let session = await readSession();
    const entityId = request.nextUrl.searchParams.get('entityId');
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');

    if (!session) {
      const adminSession = await getAdminSession();
      if (!adminSession) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');
      
      const guestId = request.headers.get('x-guest-id');
      const [totalLikes, totalDislikes, hasLiked, hasDisliked] = await Promise.all([
        ratingsApi.getTotalLikes(adminSession, entityId),
        ratingsApi.getTotalDislikes(adminSession, entityId),
        guestId ? ratingsApi.hasUserLiked(adminSession, guestId, entityId) : Promise.resolve(false),
        guestId ? ratingsApi.hasUserDisliked(adminSession, guestId, entityId) : Promise.resolve(false),
      ]);
      return { totalLikes, totalDislikes, hasLiked, hasDisliked };
    }

    const [totalLikes, totalDislikes, hasLiked, hasDisliked] = await Promise.all([
      ratingsApi.getTotalLikes(session, entityId),
      ratingsApi.getTotalDislikes(session, entityId),
      ratingsApi.hasUserLiked(session, session.user.id, entityId),
      ratingsApi.hasUserDisliked(session, session.user.id, entityId),
    ]);

    return { totalLikes, totalDislikes, hasLiked, hasDisliked };
  });
}
