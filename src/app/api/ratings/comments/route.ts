import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as ratingsApi from '@/server/ksm/modules/ratings';
import type { EntityType } from '@/server/ksm/modules/ratings';

const VALID_TYPES: EntityType[] = ['BLOG', 'PODCAST', 'COMMENT', 'FORUM', 'DRIVER', 'AUTHOR', 'APPLICATION', 'ORGANISATION'];

// GET /api/ratings/comments?entityId= — liste des commentaires d'une entité.
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    let session = await readSession();
    if (!session) {
      session = await getAdminSession();
    }
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const entityId = request.nextUrl.searchParams.get('entityId');
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');

    return ratingsApi.listComments(session, entityId);
  });
}

// POST /api/ratings/comments — { content, entityId, entityType }
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { content?: string; entityId?: string; entityType?: string };
    const content = String(body.content ?? '').trim();
    const entityId = String(body.entityId ?? '').trim();
    const entityType = String(body.entityType ?? '').toUpperCase();
    if (!content) return fail(400, 'VALIDATION_ERROR', 'content is required');
    if (!entityId) return fail(400, 'VALIDATION_ERROR', 'entityId is required');
    if (!VALID_TYPES.includes(entityType as EntityType)) return fail(400, 'VALIDATION_ERROR', 'entityType is invalid');

    const commentByName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;
    return ratingsApi.createComment(session, {
      content,
      commentByUser: session.user.id,
      commentByName,
      entityId,
      entityType: entityType as EntityType,
    });
  });
}
