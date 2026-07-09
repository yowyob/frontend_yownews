import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import { followUser, unfollowUser, getFollowCounts } from '@/server/ksm/modules/follows';

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { userId } = await params;
    await followUser(session, userId);
    return { ok: true };
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { userId } = await params;
    await unfollowUser(session, userId);
    return { ok: true };
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  return handleRoute(async () => {
    let session = await readSession();
    if (!session) {
      session = await getAdminSession();
    }
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { userId } = await params;
    const counts = await getFollowCounts(session, userId);
    return counts;
  });
}
