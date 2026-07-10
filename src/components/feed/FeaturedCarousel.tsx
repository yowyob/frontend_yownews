'use client';
import { useState } from 'react';
import FeaturedContentCard from './FeaturedContentCard';
import type { FeedItem } from './ContentFeedCard';

function navBtnStyle(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', [side]: '12px', transform: 'translateY(-50%)',
    width: '38px', height: '38px', borderRadius: '50%', border: 'none',
    background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
    color: 'var(--dark, #111827)', zIndex: 2,
  };
}

/**
 * Carrousel manuel (pas d'auto-rotation) — l'auto-play sur un carrousel est une mauvaise
 * pratique d'accessibilité/UX (contenu qui bouge sans action de l'utilisateur, cf. WCAG 2.2.2).
 * Navigation par flèches + puces, une seule carte "à la une" affichée à la fois.
 */
export default function FeaturedCarousel({ items, spacePrefix }: { items: FeedItem[]; spacePrefix: string }) {
  const [index, setIndex] = useState(0);
  if (items.length === 0) return null;
  const clamped = Math.min(index, items.length - 1);
  const item = items[clamped];

  return (
    <div style={{ marginBottom: '28px' }} role="region" aria-label="Contenus à la une">
      <div style={{ position: 'relative' }}>
        <FeaturedContentCard item={item} spacePrefix={spacePrefix} />

        {items.length > 1 && (
          <>
            <button
              type="button" aria-label="Élément précédent"
              onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
              style={navBtnStyle('left')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button
              type="button" aria-label="Élément suivant"
              onClick={() => setIndex((i) => (i + 1) % items.length)}
              style={navBtnStyle('right')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Puces sous la carte (pas en overlay) : le fond de la carte alterne image sombre /
          panneau blanc, donc un indicateur en superposition perdrait le contraste sur un des deux. */}
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }} role="tablist" aria-label="Sélection de l'élément à la une">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              role="tab"
              aria-selected={i === clamped}
              aria-label={`Élément ${i + 1} sur ${items.length}`}
              onClick={() => setIndex(i)}
              style={{
                width: i === clamped ? '20px' : '6px', height: '6px', borderRadius: '3px', border: 'none',
                background: i === clamped ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)',
                cursor: 'pointer', transition: 'width .2s, background .2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
