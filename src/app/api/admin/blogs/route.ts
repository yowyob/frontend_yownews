import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

// GET /api/admin/blogs?status=SUBMITTED|PUBLISHED — tous les blogs de l'org (gestion admin).
export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const status = request.nextUrl.searchParams.get('status') ?? undefined;
    return educationApi.listAllBlogs(session, status);
  });
}
