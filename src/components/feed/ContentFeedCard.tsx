'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import { coverPathFor, feedSegmentFor } from './contentLinks';
import CoverFallback from './CoverFallback';

export type FeedItem = {
  id: string;
  contentType?: string | null;
  title: string;
  description?: string | null;
  authorId?: string | null;
  domain?: string | null;
  freeTags?: string[] | null;
  publishedAt?: string | null;
  listenCount?: number | null;
  // Cover fixe (ex: contenu statique de la landing) — prioritaire sur coverPathFor() qui
  // pointe vers un endpoint authentifié inutilisable pour du contenu hors backend.
  coverUrl?: string | null;
};

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  BUSINESS:    { bg: '#F59E0B', text: '#fff' },
  TECH:        { bg: '#3B82F6', text: '#fff' },
  HEALTH:      { bg: '#10B981', text: '#fff' },
  EDUCATION:   { bg: '#8B5CF6', text: '#fff' },
  CULTURE:     { bg: '#EC4899', text: '#fff' },
  POLITICS:    { bg: '#6B7280', text: '#fff' },
  SPORT:       { bg: '#F97316', text: '#fff' },
  ENVIRONMENT: { bg: '#22C55E', text: '#fff' },
  ECONOMY:     { bg: '#EAB308', text: '#111' },
  INNOVATION:  { bg: '#06B6D4', text: '#fff' },
};

function domainColor(domain?: string | null) {
  if (!domain || domain === 'NONE') return { bg: 'rgba(0,0,0,.5)', text: '#fff' };
  return DOMAIN_COLORS[domain.toUpperCase()] ?? { bg: 'var(--accent)', text: '#fff' };
}

function estimateReadTime(text?: string | null) {
  if (!text) return null;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ContentFeedCard({
  item, spacePrefix, favorited, onToggleFavorite, showActions = true,
}: {
  item: FeedItem;
  spacePrefix: string;
  favorited: boolean;
  onToggleFavorite: (item: FeedItem, next: boolean) => void;
  showActions?: boolean;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const href = `${spacePrefix}/feed/${feedSegmentFor(item.contentType)}/${item.id}`;
  const readTime = estimateReadTime(item.description);
  const dc = domainColor(item.domain);

  useEffect(() => {
    if (!showActions) return;
    let cancelled = false;
    apiFetch<number>(`/api/ratings/total-likes?entityId=${item.id}`)
      .then((n) => { if (!cancelled) setLikeCount(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.id, showActions]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !favorited;
    onToggleFavorite(item, next);
    try {
      await apiFetch('/api/education/favorites/toggle', {
        method: 'POST',
        body: { entityId: item.id, contentType: item.contentType ?? 'BLOG' },
      });
    } catch {
      onToggleFavorite(item, !next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link href={href} style={{
      display: 'block', background: 'transparent',
      borderRadius: '14px', overflow: 'hidden',
      textDecoration: 'none', color: 'inherit',
      transition: 'opacity .15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '.85'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
    >
      {/* Image avec overlay + badges */}
      <div style={{ position: 'relative', height: '200px', background: 'var(--gray-100, #f3f4f6)', overflow: 'hidden' }}>
        {coverFailed ? (
          <CoverFallback id={item.id} title={item.title} contentType={item.contentType} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl || coverPathFor(item.contentType, item.id)}
            alt=""
            onError={() => setCoverFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* Gradient overlay bas */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.55) 0%, transparent 55%)' }} />
        {/* Badge domaine bas-gauche */}
        {item.domain && item.domain !== 'NONE' && (
          <span style={{
            position: 'absolute', bottom: '12px', left: '12px',
            background: dc.bg, color: dc.text,
            fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '20px',
          }}>
            {item.domain}
          </span>
        )}
        {/* Temps de lecture haut-droite */}
        {readTime && (
          <span style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'rgba(0,0,0,.45)', color: '#fff',
            fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
          }}>
            {readTime} min
          </span>
        )}
      </div>

      {/* Corps */}
      <div style={{ padding: '16px 18px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </h2>
        {item.description && (
          <p style={{ fontSize: '13px', color: 'var(--gray-500, #6b7280)', margin: '0 0 10px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {item.description}
          </p>
        )}

        {/* Tags libres */}
        {item.freeTags && item.freeTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {item.freeTags.slice(0, 2).map((t) => (
              <span key={t} style={{ fontSize: '11px', color: 'var(--blue, #2563eb)', background: 'rgba(37,99,235,.07)', padding: '2px 8px', borderRadius: '20px' }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Footer : date + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--gray-100, #f3f4f6)' }}>
          <span style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)', flex: 1 }}>
            {formatDate(item.publishedAt)}
          </span>

          {showActions && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gray-500, #6b7280)', fontSize: '12px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                {likeCount ?? 0}
              </span>
              <button
                type="button"
                onClick={toggleFavorite}
                title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: favorited ? 'var(--accent)' : 'var(--gray-300, #d1d5db)', display: 'flex', alignItems: 'center' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
