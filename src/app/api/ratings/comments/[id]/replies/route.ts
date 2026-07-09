import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as ratingsApi from '@/server/ksm/modules/ratings';

// GET /api/ratings/comments/{id}/replies — réponses à un commentaire.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    return ratingsApi.listReplies(session, id);
  });
}

// POST /api/ratings/comments/{id}/replies — { content } : répondre à un commentaire.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    const body = (await request.json()) as { content?: string };
    const content = String(body.content ?? '').trim();
    if (!content) return fail(400, 'VALIDATION_ERROR', 'content is required');

    const replyByName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;
    return ratingsApi.createReply(session, id, { content, replyByUserId: session.user.id, replyByName });
  });
}
