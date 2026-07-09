import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as adminApi from '@/server/ksm/modules/administration';

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id } = await ctx.params;
    const body = (await request.json()) as { roleId?: string };
    const roleId = String(body.roleId ?? '').trim();
    if (!roleId) return fail(400, 'VALIDATION_ERROR', 'roleId is required');

    return adminApi.assignRole(session, id, roleId);
  });
}
