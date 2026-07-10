import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as ratingsApi from '@/server/ksm/modules/ratings';
import type { EntityType } from '@/server/ksm/modules/ratings';

const VALID_TYPES: EntityType[] = ['BLOG', 'PODCAST', 'COURSE', 'COMMENT', 'FORUM', 'DRIVER', 'AUTHOR', 'APPLICATION', 'ORGANISATION'];

// POST /api/ratings/like-or-dislike — { entityId, entityType, isLike }
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    let session = await readSession();
    let userId: string;

    if (!session) {
      const guestId = request.headers.get('x-guest-id');
      if (!guestId) return fail(400, 'VALIDATION_ERROR', 'guest-id header is required for anonymous interactions');

      session = await getAdminSession();
      if (!session) return fail(500, 'ADMIN_SESSION_FAILED', 'No admin session');
      userId = guestId;
    } else {
      userId = session.user.id;
    }

    const body = (await request.json()) as { entityId?: string; entityType?: string; isLike?: boolean };
    const entityId = String(body.entityId ?? '').trim();
    const entityType = String(body.entityType ?? '').toUpperCase();
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');
    if (!VALID_TYPES.includes(entityType as EntityType)) return fail(400, 'VALIDATION_ERROR', 'entityType is invalid');
    if (typeof body.isLike !== 'boolean') return fail(400, 'VALIDATION_ERROR', 'isLike must be a boolean');

    await ratingsApi.likeOrDislike(session, userId, entityId, entityType as EntityType, body.isLike);
    return { ok: true };
  });
}
