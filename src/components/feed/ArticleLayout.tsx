'use client';
import type { ReactNode } from 'react';

/**
 * Charpente visuelle partagée d'un article/podcast/cours : grille 2 colonnes (contenu
 * principal — cover puis texte — + barre latérale auteur/actions, sticky en desktop).
 * Utilisée par la page de lecture publiée, l'aperçu live de l'éditeur et la modale de
 * prévisualisation, pour garantir un rendu identique partout.
 */
export default function ArticleLayout({
  maxWidth = '1180px',
  coverSrc,
  onCoverError,
  coverFallback,
  compact = false,
  article,
  aside,
}: {
  maxWidth?: string;
  coverSrc?: string | null;
  onCoverError?: () => void;
  coverFallback?: ReactNode;
  compact?: boolean;
  article: ReactNode;
  aside: ReactNode;
}) {
  const coverHeight = compact ? '120px' : '192px';
  const coverRadius = compact ? '6px' : '8px';
  const asideWidth = compact ? '10rem' : '18rem';
  const columnGap = compact ? '28px' : '64px';

  return (
    <div className="article-layout" style={{ maxWidth, margin: '0 auto', background: '#fff' }}>
      <div className="article-layout-grid" style={{ display: 'grid', gridTemplateColumns: `minmax(0,1fr) ${asideWidth}`, columnGap }}>
        <article style={{ maxWidth: compact ? 'none' : '65ch', minWidth: 0 }}>
          {(coverSrc || coverFallback) && (
            <div style={{ position: 'relative', height: coverHeight, borderRadius: coverRadius, overflow: 'hidden', marginBottom: compact ? '20px' : '40px', background: 'var(--gray-100, #f3f4f6)' }}>
              {coverSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverSrc}
                  alt=""
                  onError={onCoverError}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                coverFallback
              )}
            </div>
          )}
          {article}
        </article>
        <aside className="article-layout-aside" style={{ alignSelf: 'start', minWidth: 0 }}>{aside}</aside>
      </div>

      <style>{`
        .article-layout-aside .eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: var(--gray-400, #9ca3af); margin: 0 0 10px; }
        .article-layout-grid { overflow-wrap: anywhere; word-break: break-word; }
        .content-detail-body p { margin: 0 0 20px; }
        .content-detail-body h2 { font-size: 22px; font-weight: 700; margin: 28px 0 12px; }
        .content-detail-body h3 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; }
        .content-detail-body ul, .content-detail-body ol { padding-left: 22px; margin: 0 0 20px; }
        .content-detail-body blockquote { border-left: 3px solid var(--gray-200, #e5e7eb); padding-left: 16px; color: var(--gray-500, #6b7280); font-style: italic; }
        .content-detail-body a { color: var(--accent); text-decoration: underline; }
        @media(min-width: 1024px) { .article-layout-aside { position: sticky; top: 32px; } }
        @media(max-width: ${compact ? '520px' : '900px'}) {
          .article-layout-grid { grid-template-columns: 1fr!important; }
          .article-layout-aside { position: static!important; margin-top: ${compact ? '24px' : '40px'}; }
        }
      `}</style>
    </div>
  );
}
