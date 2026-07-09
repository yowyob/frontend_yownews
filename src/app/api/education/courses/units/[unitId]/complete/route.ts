import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { completeCourseUnit } from '@/server/ksm/modules/education';

export async function POST(request: Request, { params }: { params: Promise<{ unitId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { unitId } = await params;
    await completeCourseUnit(session, unitId);
    return { ok: true };
  });
}
