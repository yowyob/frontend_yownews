import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as educationApi from '@/server/ksm/modules/education';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    let session = await readSession();
    if (!session) session = await getAdminSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const raw = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 20;
    return educationApi.getPodcastFeed(session, limit);
  });
}
