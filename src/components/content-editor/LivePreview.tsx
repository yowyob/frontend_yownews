'use client';
import ArticleLayout from '@/components/feed/ArticleLayout';
import { useSessionUser } from '@/components/providers/session-provider';
import type { ReactNode } from 'react';

const WORDS_PER_MIN = 200;

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function readingTimeFor(html?: string) {
  if (!html) return 0;
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  if (!text) return 0;
  return Math.max(1, Math.round(text.split(/\s+/).length / WORDS_PER_MIN));
}

const todayLabel = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

/**
 * Aperçu live, à côté du formulaire d'édition — rend le brouillon en cours exactement
 * comme le gabarit d'un contenu publié (cover pleine largeur + colonne article/aside),
 * en s'appuyant sur `ArticleLayout` pour garantir la même mise en page qu'en production.
 */
export default function LivePreview({
  typeLabel,
  title,
  description,
  tags,
  coverSrc,
  bodyHtml,
  extra,
}: {
  typeLabel: string;
  title: string;
  description: string;
  tags: string[];
  coverSrc: string | null;
  bodyHtml?: string;
  extra?: ReactNode;
}) {
  const sessionUser = useSessionUser();
  const authorLabel = [sessionUser?.firstName, sessionUser?.lastName].filter(Boolean).join(' ').trim() || sessionUser?.email || 'Vous';
  const hasContent = title.trim() || description.trim() || (bodyHtml && bodyHtml.replace(/<[^>]*>/g, '').trim());

  const article = (
    <>
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {tags.map((t) => (
            <span key={t} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', background: 'var(--gray-100, #f3f4f6)', color: 'var(--gray-600, #4b5563)' }}>#{t}</span>
          ))}
        </div>
      )}

      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent)', fontWeight: 700, margin: '0 0 12px' }}>
        {typeLabel}
      </p>

      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-.01em', margin: 0, color: 'var(--dark, #111827)' }}>
        {title.trim() || 'Titre de votre article'}
      </h1>

      {description.trim() && (
        <p style={{ marginTop: '10px', fontSize: '14px', lineHeight: 1.6, color: 'var(--gray-500, #6b7280)' }}>{description}</p>
      )}

      {extra ?? (
        <div
          className="content-detail-body"
          style={{ marginTop: '20px', fontSize: '14px', lineHeight: 1.6, color: 'var(--gray-700, #374151)' }}
          dangerouslySetInnerHTML={{ __html: bodyHtml && bodyHtml.replace(/<[^>]*>/g, '').trim() ? bodyHtml : '<p><em>Votre contenu apparaîtra ici au fur et à mesure de la rédaction.</em></p>' }}
        />
      )}

      <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '18px', opacity: 0.45, pointerEvents: 'none' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-500, #6b7280)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
          J&apos;aime
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-500, #6b7280)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: 'scaleY(-1)' }}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
          Je n&apos;aime pas
        </span>
      </div>
    </>
  );

  const aside = (
    <>
      <div style={{ marginBottom: '20px' }}>
        <p className="eyebrow">Auteur</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--primary, #1F5FBF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '12px', color: '#fff', flexShrink: 0 }}>
            {initials(authorLabel)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: '13px', margin: 0, color: 'var(--dark, #111827)' }}>{authorLabel}</p>
            <p style={{ fontSize: '11px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>Auteur</p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p className="eyebrow">Publié</p>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '14px', margin: '0 0 4px', color: 'var(--dark, #111827)' }}>Aujourd&apos;hui · {todayLabel}</p>
        {bodyHtml && (
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            {readingTimeFor(bodyHtml)} min de lecture
          </p>
        )}
      </div>

      <div style={{ opacity: 0.45, pointerEvents: 'none' }}>
        <p className="eyebrow">Actions</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', fontSize: '12px', color: 'var(--gray-700, #374151)' }}>
          <span>Ajouter aux favoris</span>
          <span>Partager</span>
        </div>
      </div>
    </>
  );

  return (
    <div>
      <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, color: 'var(--gray-400, #9ca3af)', margin: '0 0 12px' }}>
        Aperçu en direct
      </p>
      <div style={{ border: '1px solid var(--gray-100, #f3f4f6)', borderRadius: '14px', padding: '20px', background: '#fff', opacity: hasContent ? 1 : 0.85 }}>
        <ArticleLayout compact maxWidth="none" coverSrc={coverSrc} article={article} aside={aside} />
      </div>
    </div>
  );
}
