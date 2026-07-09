import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as educationApi from '@/server/ksm/modules/education';

// POST /api/education/favorites/toggle — { entityId, contentType } : ajoute/retire des favoris.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { entityId?: string; contentType?: string };
    const entityId = String(body.entityId ?? '').trim();
    const contentType = String(body.contentType ?? '').trim().toUpperCase();
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');
    if (!['BLOG', 'PODCAST', 'COURSE'].includes(contentType)) {
      return fail(400, 'VALIDATION_ERROR', 'contentType must be BLOG, PODCAST or COURSE');
    }

    const message = await educationApi.toggleFavorite(session, entityId, contentType);
    return { message };
  });
}
