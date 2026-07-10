'use client';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import ContentFeedCard, { type FeedItem } from './ContentFeedCard';
import PodcastFeedCard from './PodcastFeedCard';
import FeaturedCarousel from './FeaturedCarousel';

const FEATURED_COUNT = 5;

const FEED_PATH: Record<'BLOG' | 'PODCAST' | 'COURSE', string> = {
  BLOG: '/api/feed/blogs',
  PODCAST: '/api/feed/podcasts',
  COURSE: '/api/feed/courses',
};

const FEED_TITLE: Record<'BLOG' | 'PODCAST' | 'COURSE', string> = {
  BLOG: 'Blogs',
  PODCAST: 'Podcasts',
  COURSE: 'Cours',
};

function favoriteKey(item: Pick<FeedItem, 'id' | 'contentType'>) {
  return `${(item.contentType ?? '').toUpperCase()}:${item.id}`;
}

export default function FeedView({ contentType }: { contentType: 'BLOG' | 'PODCAST' | 'COURSE' }) {
  const pathname = usePathname();
  const spacePrefix = pathname.startsWith('/reader')
    ? '/reader'
    : pathname.startsWith('/editor')
      ? '/editor'
      : pathname.startsWith('/admin')
        ? '/admin'
        : '/public';
  const [items, setItems] = useState<FeedItem[] | null>(null);
  // Le bandeau "à la une" charge les contenus les plus likés (tri agrégé côté BFF, cf.
  // /api/feed/blogs?sort=liked) — indépendant du fil principal, trié par date de publication.
  const [featured, setFeatured] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      setFeatured([]);
      setError(null);
      try {
        const data = await apiFetch<FeedItem[]>(`${FEED_PATH[contentType]}?limit=20`);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement du fil');
      }
      // Les cours ne supportent pas encore le tri par popularité côté BFF — dégrade
      // silencieusement vers "pas de bandeau" plutôt que de planter le fil principal.
      if (contentType !== 'COURSE') {
        apiFetch<FeedItem[]>(`${FEED_PATH[contentType]}?limit=${FEATURED_COUNT}&sort=liked`)
          .then((data) => { if (!cancelled) setFeatured(Array.isArray(data) ? data : []); })
          .catch(() => {});
      }
    })();
    return () => { cancelled = true; };
  }, [contentType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const favs = await apiFetch<FeedItem[]>('/api/education/favorites');
        if (!cancelled && Array.isArray(favs)) setFavorites(new Set(favs.map(favoriteKey)));
      } catch {
        /* favoris indisponibles — les icônes restent simplement non cochées */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleFavorite = (item: FeedItem, next: boolean) => {
    setFavorites((prev) => {
      const updated = new Set(prev);
      const key = favoriteKey(item);
      if (next) updated.add(key); else updated.delete(key);
      return updated;
    });
  };

  const featuredIds = new Set(featured.map((it) => it.id));
  const rest = (items ?? []).filter((it) => !featuredIds.has(it.id));

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>{FEED_TITLE[contentType]}</h1>
      </div>

      {error && (
        <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {!items && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Chargement…</div>
      )}

      {items && items.length === 0 && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>
          Aucun contenu pour le moment.
        </div>
      )}

      {featured.length > 0 && <FeaturedCarousel items={featured} spacePrefix={spacePrefix} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
        {rest.map((it) =>
          it.contentType?.toUpperCase() === 'PODCAST' ? (
            <PodcastFeedCard
              key={`${it.contentType}-${it.id}`}
              item={it}
              spacePrefix={spacePrefix}
              favorited={favorites.has(favoriteKey(it))}
              onToggleFavorite={toggleFavorite}
            />
          ) : (
            <ContentFeedCard
              key={`${it.contentType}-${it.id}`}
              item={it}
              spacePrefix={spacePrefix}
              favorited={favorites.has(favoriteKey(it))}
              onToggleFavorite={toggleFavorite}
            />
          )
        )}
      </div>
    </div>
  );
}
