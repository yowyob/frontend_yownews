import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getCourseProgress } from '@/server/ksm/modules/education';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) {
      return { enrolled: false, percent: 0, completedUnitIds: [] };
    }

    const { id } = await params;
    const progress = await getCourseProgress(session, id);
    return progress;
  });
}
