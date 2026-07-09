import 'server-only';
import { ok } from '@/server/api-response';
import { getAdminSession } from '@/server/ksm/admin-session';
import * as educationApi from '@/server/ksm/modules/education';
import type { FeedItem } from '@/server/ksm/modules/education';
import type { PublicFeed, PublicFeedItem, PublicKind } from '@/lib/types/public-feed';

// Feed PUBLIC (landing) — aucune session utilisateur requise. On s'appuie sur la session
// service admin (getAdminSession) pour lire les contenus publiés, exactement comme le reste
// des flux education, mais exposés sans authentification pour la page d'accueil.
// Cache mémoire court pour ne pas marteler KSM à chaque visite.

export const dynamic = 'force-dynamic';

const TTL_MS = 60_000;
let cache: { at: number; data: PublicFeed } | null = null;

function mapItems(items: FeedItem[], type: PublicKind): PublicFeedItem[] {
  return (Array.isArray(items) ? items : []).map((it) => ({
    id: it.id,
    type,
    title: it.title,
    description: it.description ?? null,
    domain: it.domain ?? null,
    publishedAt: it.publishedAt ?? null,
    listenCount: it.listenCount ?? null,
    coverUrl: `/api/public/cover/${type}/${it.id}`,
  }));
}

const EMPTY: PublicFeed = { blogs: [], podcasts: [], courses: [] };

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return ok(cache.data);

  const session = await getAdminSession();
  if (!session) return ok(EMPTY); // dégradation propre : landing sans contenu plutôt qu'une 500

  try {
    const [blogs, podcasts, courses] = await Promise.all([
      educationApi.getBlogFeed(session, 8),
      educationApi.getPodcastFeed(session, 8),
      educationApi.getCourseFeed(session, 8),
    ]);
    const data: PublicFeed = {
      blogs: mapItems(blogs, 'blog'),
      podcasts: mapItems(podcasts, 'podcast'),
      courses: mapItems(courses, 'course'),
    };
    cache = { at: now, data };
    return ok(data);
  } catch {
    return ok(EMPTY);
  }
}
