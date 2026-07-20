'use client';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import ContentFeedCard, { type FeedItem } from './ContentFeedCard';
import PodcastFeedCard from './PodcastFeedCard';
import FeaturedCarousel from './FeaturedCarousel';

const FEATURED_COUNT = 4;

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

// Squelette de chargement — reproduit la mise en page finale (bandeau « à la une » + grille de
// cartes) pour réserver la hauteur et éviter le saut visuel à l'arrivée du vrai contenu. Effet
// shimmer via un dégradé animé (style local, pas de composant skeleton partagé dans le repo).
function FeedSkeleton({ withCarousel }: { withCarousel: boolean }) {
  const block = { background: 'var(--gray-200, #e5e7eb)', backgroundImage: 'linear-gradient(90deg, var(--gray-200,#e5e7eb) 0%, var(--gray-100,#f3f4f6) 40%, var(--gray-200,#e5e7eb) 80%)', backgroundSize: '200% 100%', animation: 'feed-shimmer 1.3s ease-in-out infinite', borderRadius: '8px' } as const;
  return (
    <div aria-hidden="true">
      {withCarousel && <div style={{ ...block, height: '300px', width: '100%', borderRadius: '16px', marginBottom: '28px' }} />}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div style={{ ...block, height: '200px', borderRadius: '14px 14px 0 0' }} />
            <div style={{ padding: '16px 18px' }}>
              <div style={{ ...block, height: '14px', width: '90%', marginBottom: '8px' }} />
              <div style={{ ...block, height: '14px', width: '65%', marginBottom: '14px' }} />
              <div style={{ ...block, height: '10px', width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes feed-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
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
  // Le carrousel et le fil sont deux requêtes distinctes. On ne peint la page qu'une fois les DEUX
  // résolues (`featuredReady`), sinon le fil s'affiche seul puis le carrousel surgit au-dessus en
  // poussant les cartes vers le bas (saut de mise en page). `featuredReady` couvre aussi l'échec du
  // carrousel (best-effort) et le cas COURSE, qui n'en demande pas.
  const [featuredReady, setFeaturedReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setItems(null);
      setFeatured([]);
      setFeaturedReady(false);
      setError(null);

      // Fil principal.
      apiFetch<FeedItem[]>(`${FEED_PATH[contentType]}?limit=20`)
        .then((data) => { if (!cancelled) setItems(Array.isArray(data) ? data : []); })
        .catch((e) => {
          if (!cancelled) {
            setItems([]);
            setError(e instanceof Error ? e.message : 'Erreur de chargement du fil');
          }
        });

      // Bandeau "à la une", en parallèle. Les cours ne supportent pas encore le tri par popularité
      // côté BFF — on dégrade silencieusement vers "pas de bandeau" et on marque quand même prêt.
      if (contentType === 'COURSE') {
        setFeaturedReady(true);
      } else {
        apiFetch<FeedItem[]>(`${FEED_PATH[contentType]}?limit=${FEATURED_COUNT}&sort=liked`)
          .then((data) => { if (!cancelled) setFeatured(Array.isArray(data) ? data : []); })
          .catch(() => {})
          .finally(() => { if (!cancelled) setFeaturedReady(true); });
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
  // Prêt à peindre uniquement quand le fil ET le carrousel ont résolu : garantit que les deux blocs
  // apparaissent d'un seul coup, sans réagencement.
  const ready = items !== null && featuredReady;

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

      {!ready && !error && <FeedSkeleton withCarousel={contentType !== 'COURSE'} />}

      {ready && items && items.length === 0 && !error && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>
          Aucun contenu pour le moment.
        </div>
      )}

      {ready && featured.length > 0 && <FeaturedCarousel items={featured} spacePrefix={spacePrefix} />}

      {ready && (
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
      )}
    </div>
  );
}
