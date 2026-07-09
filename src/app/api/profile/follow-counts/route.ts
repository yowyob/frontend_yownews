import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as educationApi from '@/server/ksm/modules/education';

// GET /api/profile/follow-counts — compteurs réels Followers/Following pour l'utilisateur courant,
// dérivés des abonnements (pas de table "follow" dédiée dans KSM, voir docs/ADMIN_EDITOR_CONTEXT.md).
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const [followers, subscriptions] = await Promise.all([
      educationApi.getFollowerCount(session, session.user.id).catch(() => 0),
      educationApi.getMySubscriptions(session).catch(() => []),
    ]);
    const following = new Set(subscriptions.map((s) => s.authorId)).size;

    return { followers: typeof followers === 'number' ? followers : 0, following };
  });
}
