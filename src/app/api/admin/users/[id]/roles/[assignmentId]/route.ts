import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as adminApi from '@/server/ksm/modules/administration';

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string; assignmentId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id, assignmentId } = await ctx.params;
    await adminApi.revokeRole(session, id, assignmentId);
    return { revoked: true };
  });
}
