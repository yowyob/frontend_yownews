import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as educationApi from '@/server/ksm/modules/education';

// GET /api/education/favorites — favoris de l'utilisateur courant, hydratés (titre/domaine/tags…).
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    return educationApi.listMyFavoritesDetailed(session);
  });
}
