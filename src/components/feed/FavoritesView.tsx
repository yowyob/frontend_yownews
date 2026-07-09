'use client';
import { useEffect, useState } from 'react';
import { usePathname } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import ContentFeedCard, { type FeedItem } from './ContentFeedCard';

function favoriteKey(item: Pick<FeedItem, 'id' | 'contentType'>) {
  return `${(item.contentType ?? '').toUpperCase()}:${item.id}`;
}

export default function FavoritesView() {
  const pathname = usePathname();
  const spacePrefix = pathname.startsWith('/reader') ? '/reader' : pathname.startsWith('/editor') ? '/editor' : '/admin';
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItems(null);
      setError(null);
      try {
        const data = await apiFetch<FeedItem[]>('/api/education/favorites');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement des favoris');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Retrait local immédiat — un item retiré des favoris disparaît de cette liste sans recharger.
  const handleToggle = (item: FeedItem, next: boolean) => {
    if (next) return;
    setItems((prev) => (prev ?? []).filter((it) => favoriteKey(it) !== favoriteKey(item)));
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>Favoris</h1>
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
          Aucun favori pour le moment.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
        {items?.map((it) => (
          <ContentFeedCard
            key={`${it.contentType}-${it.id}`}
            item={it}
            spacePrefix={spacePrefix}
            favorited
            onToggleFavorite={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
