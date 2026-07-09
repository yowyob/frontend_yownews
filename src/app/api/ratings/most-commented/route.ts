import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as ratingsApi from '@/server/ksm/modules/ratings';

// GET /api/ratings/most-commented — UUID du contenu ayant le plus de commentaires.
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    return ratingsApi.getMostCommented(session);
  });
}
