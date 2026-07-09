import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

// POST /api/forum/groups/[id]/members
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = await request.json();
    if (!body.memberId) return fail(400, 'BAD_REQUEST', 'Missing memberId');
    return forumApi.addMemberToCommunity(session, id, body.memberId);
  });
}
