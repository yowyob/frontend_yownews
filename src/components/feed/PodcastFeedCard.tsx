'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';
import { coverPathFor, feedSegmentFor } from './contentLinks';
import type { FeedItem } from './ContentFeedCard';

const WAVE_HEIGHTS = [30, 70, 45, 88, 55, 72, 38, 95, 62, 50, 80, 42, 90, 58, 68, 35, 78, 85, 46, 65];

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

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PodcastFeedCard({
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
        body: { entityId: item.id, contentType: 'PODCAST' },
      });
    } catch {
      onToggleFavorite(item, !next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link href={href} style={{
      display: 'block', background: '#1a1a2e',
      border: '1px solid rgba(255,255,255,.08)', borderRadius: '16px',
      overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.25)',
      textDecoration: 'none', color: 'inherit',
      transition: 'box-shadow .15s, transform .15s',
    }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(0,0,0,.4)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.25)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      {/* Cover + overlay */}
      <div style={{ position: 'relative', height: '180px', background: '#0d0d1a', overflow: 'hidden' }}>
        {!coverFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPathFor(item.contentType, item.id)}
            alt=""
            onError={() => setCoverFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.6 }}
          />
        )}
        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,26,.9) 0%, transparent 60%)' }} />

        {/* Domain badge */}
        {item.domain && item.domain !== 'NONE' && (
          <span style={{
            position: 'absolute', top: '12px', left: '12px',
            background: dc.bg, color: dc.text,
            fontSize: '10px', fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase',
            padding: '4px 10px', borderRadius: '20px',
          }}>
            {item.domain}
          </span>
        )}

        {/* Listen count badge */}
        {item.listenCount != null && item.listenCount > 0 && (
          <span style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'rgba(0,0,0,.55)', color: 'rgba(255,255,255,.85)',
            fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="11" height="11" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm-1 13V8l6 4-6 4z"/></svg>
            {item.listenCount.toLocaleString('fr-FR')}
          </span>
        )}

        {/* Waveform + play */}
        <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          {/* Play button */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); window.location.href = href; }}
            aria-label="Écouter"
            style={{
              flexShrink: 0, width: '38px', height: '38px',
              background: 'linear-gradient(135deg, var(--blue, #2563eb), var(--accent, #f97316))',
              borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,.5)',
            }}
          >
            <svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </button>

          {/* Waveform bars */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', height: '32px' }}>
            {WAVE_HEIGHTS.map((h, i) => (
              <span key={i} style={{
                flex: 1, height: `${h}%`,
                background: i < 8 ? 'rgba(37,99,235,.9)' : 'rgba(255,255,255,.3)',
                borderRadius: '2px', display: 'block',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px' }}>
        <h2 style={{
          fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 700,
          margin: '0 0 6px', lineHeight: 1.35, color: '#fff',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.title}
        </h2>
        {item.description && (
          <p style={{
            fontSize: '12px', color: 'rgba(255,255,255,.5)', margin: '0 0 10px', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.description}
          </p>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.35)', flex: 1 }}>
            {formatDate(item.publishedAt)}
          </span>

          {showActions && (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,.5)', fontSize: '12px' }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                {likeCount ?? 0}
              </span>
              <button
                type="button"
                onClick={toggleFavorite}
                title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px', color: favorited ? 'var(--accent)' : 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center' }}
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
