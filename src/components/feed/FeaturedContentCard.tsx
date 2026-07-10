'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import { coverPathFor, feedSegmentFor } from './contentLinks';
import CoverFallback from './CoverFallback';
import type { FeedItem } from './ContentFeedCard';

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

/**
 * Bandeau "à la une" — met en avant le contenu le plus récent d'un feed en grand format,
 * au-dessus de la grille resserrée (cf. remplissage de l'espace + hiérarchie visuelle).
 */
export default function FeaturedContentCard({ item, spacePrefix }: { item: FeedItem; spacePrefix: string }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const isPodcast = item.contentType?.toUpperCase() === 'PODCAST';
  const href = `${spacePrefix}/feed/${feedSegmentFor(item.contentType)}/${item.id}`;
  const readTime = estimateReadTime(item.description);
  const dc = domainColor(item.domain);

  useEffect(() => {
    let cancelled = false;
    apiFetch<number>(`/api/ratings/total-likes?entityId=${item.id}`)
      .then((n) => { if (!cancelled) setLikeCount(n); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.id]);

  return (
    <>
    <Link
      href={href}
      className="feed-featured"
      style={{
        display: 'grid', gridTemplateColumns: '1.1fr 1fr', minHeight: '280px',
        background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '16px',
        overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.06)', textDecoration: 'none', color: 'inherit',
        marginBottom: '28px', transition: 'box-shadow .15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px rgba(0,0,0,.1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,.06)'; }}
    >
      <div style={{ position: 'relative', background: 'var(--gray-100, #f3f4f6)', overflow: 'hidden' }}>
        {coverFailed ? (
          <CoverFallback id={item.id} title={item.title} contentType={item.contentType} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPathFor(item.contentType, item.id)}
            alt=""
            onError={() => setCoverFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {isPodcast && (
          <span style={{
            position: 'absolute', bottom: '16px', left: '16px', width: '44px', height: '44px',
            borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(255,107,53,.4)',
          }}>
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </span>
        )}
      </div>

      <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>À la une</span>
          {item.domain && item.domain !== 'NONE' && (
            <span style={{ background: dc.bg, color: dc.text, fontSize: '10px', fontWeight: 700, letterSpacing: '.6px', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '20px' }}>
              {item.domain}
            </span>
          )}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: '0 0 12px', lineHeight: 1.25,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.title}
        </h2>

        {item.description && (
          <p style={{
            fontSize: '14px', color: 'var(--gray-500, #6b7280)', margin: '0 0 20px', lineHeight: 1.6,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '14px', paddingTop: '16px', borderTop: '1px solid var(--gray-100, #f3f4f6)', fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>
          <span>{formatDate(item.publishedAt)}</span>
          {isPodcast ? (
            item.listenCount != null && item.listenCount > 0 && <span>{item.listenCount.toLocaleString('fr-FR')} écoutes</span>
          ) : (
            readTime && <span>{readTime} min de lecture</span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
            {likeCount ?? 0}
          </span>
        </div>
      </div>
    </Link>
    <style>{`@media(max-width:640px){ .feed-featured{ grid-template-columns: 1fr!important; } .feed-featured > div:first-child{ height: 200px; } }`}</style>
    </>
  );
}
