import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

// POST /api/admin/courses/{id}/units/{unitId}/reject — surcharge le statut d'une unité,
// indépendamment du cours parent.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string; unitId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id, unitId } = await params;
    return educationApi.rejectCourseUnit(session, id, unitId);
  });
}
