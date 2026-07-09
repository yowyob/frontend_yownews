import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

// GET /api/forum/groups — groupes publics (VALIDATED)
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    return forumApi.listPublicGroups(session);
  });
}

// POST /api/forum/groups — créer un groupe
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const body = (await request.json()) as Parameters<typeof forumApi.createGroup>[1];
    const name = String(body.name ?? '').trim();
    if (!name) return fail(400, 'VALIDATION_ERROR', 'name is required');
    return forumApi.createGroup(session, { ...body, name, creatorId: body.creatorId ?? session.user.id });
  });
}
