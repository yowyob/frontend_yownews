import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { postId } = await params;
    return forumApi.listCommentairesByPost(session, postId);
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { postId } = await params;
    const body = (await request.json()) as { content?: string; commentaireParentId?: string };
    const content = String(body.content ?? '').trim();
    if (!content) return fail(400, 'VALIDATION_ERROR', 'content is required');
    const authorName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;
    return forumApi.createCommentaire(session, { content, authorId: session.user.id, authorName, postId, commentaireParentId: body.commentaireParentId });
  });
}
