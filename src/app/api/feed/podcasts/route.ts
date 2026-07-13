import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as educationApi from '@/server/ksm/modules/education';
import * as ratingsApi from '@/server/ksm/modules/ratings';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    let session = await readSession();
    if (!session) session = await getAdminSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const raw = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 20;
    const sort = request.nextUrl.searchParams.get('sort');

    if (sort === 'liked') {
      // Bandeau "à la une" : on classe par popularité (nombre de likes) plutôt que par date —
      // logique agrégée côté BFF pour éviter de faire porter ce tri au client.
      const pool = await educationApi.getPodcastFeed(session, Math.min(limit * 4, 50));
      const withLikes = await Promise.all(
        pool.map(async (item) => ({ item, likes: await ratingsApi.getTotalLikes(session, item.id).catch(() => 0) })),
      );
      // Un contenu sans aucun like n'a pas sa place "à la une" — il reste visible dans le fil
      // normal (cf. FeedView.tsx, qui exclut simplement les ids déjà mis en avant ici).
      return withLikes.filter((w) => w.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, limit).map((w) => w.item);
    }

    return educationApi.getPodcastFeed(session, limit);
  });
}
