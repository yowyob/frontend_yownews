import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const body = (await request.json()) as { title?: string; content?: string; groupId?: string; categoriesIds?: string[] };
    const title = String(body.title ?? '').trim();
    const content = String(body.content ?? '').trim();
    const groupId = String(body.groupId ?? '').trim();
    if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');
    if (!content) return fail(400, 'VALIDATION_ERROR', 'content is required');
    if (!groupId) return fail(400, 'VALIDATION_ERROR', 'groupId is required');
    const authorName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;
    return forumApi.createPost(session, {
      title, content, groupId,
      authorId: session.user.id,
      authorName,
      categoriesIds: Array.isArray(body.categoriesIds) ? body.categoriesIds : [],
    });
  });
}
