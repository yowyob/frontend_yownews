import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';
import { resolveUserNames } from '@/server/ksm/user-names';

// GET /api/forum/groups/[id]/requests — List pending requests for a group.
// Le modèle JoinRequest KSM n'expose que `userId` : on enrichit chaque demande avec `userName`
// (best-effort) pour que le créateur voie QUI demande à rejoindre plutôt qu'un UUID.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const requests = await forumApi.getPendingRequests(session, id);
    const names = await resolveUserNames(requests.map((r) => r.userId));
    return requests.map((r) => ({ ...r, userName: names.get(r.userId) ?? null }));
  });
}

// POST /api/forum/groups/[id]/requests — Request to join a community
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    // user requests for themselves
    return forumApi.requestToJoinCommunity(session, id, session.user.id);
  });
}
