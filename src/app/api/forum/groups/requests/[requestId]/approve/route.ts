import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

// PUT /api/forum/groups/requests/[requestId]/approve
export async function PUT(_req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { requestId } = await params;
    return forumApi.approveJoinRequest(session, requestId, session.user.id);
  });
}
