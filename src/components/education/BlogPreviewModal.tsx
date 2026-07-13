'use client';
import { useState } from 'react';
import ArticleLayout from '@/components/feed/ArticleLayout';
import AudioPlayer from '@/components/feed/AudioPlayer';

export type BlogPreviewData = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  tags?: string[] | null;
  freeTags?: string[] | null;
};

// Modale de prévisualisation d'un contenu (blog/podcast/cours) — partagée entre l'espace
// Rédacteur et la gestion admin. Rendue avec `ArticleLayout` pour rester conforme au gabarit
// de la page publiée (cover pleine largeur + colonne article/aside).
export default function BlogPreviewModal({ blog, onClose, coverPath, audioPath, typeLabel = 'Article' }: {
  blog: BlogPreviewData;
  onClose: () => void;
  coverPath?: string;
  audioPath?: string;
  typeLabel?: string;
}) {
  const [coverFailed, setCoverFailed] = useState(false);
  const allTags = [...(blog.tags ?? []), ...(blog.freeTags ?? [])];

  const article = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--accent)', fontWeight: 700, margin: '0 0 8px' }}>{typeLabel}</p>
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'var(--gray-100, #f3f4f6)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}>×</button>
      </div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--dark, #111827)' }}>{blog.title}</h1>
      {blog.description && <p style={{ color: 'var(--gray-600, #4b5563)', fontSize: '15px', marginTop: '10px' }}>{blog.description}</p>}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0' }}>
          {allTags.map((t) => (
            <span key={t} style={{ fontSize: '12px', color: 'var(--blue, #2563eb)', background: 'rgba(37,99,235,.07)', padding: '2px 8px', borderRadius: '20px' }}>#{t}</span>
          ))}
        </div>
      )}
      {audioPath && (
        <AudioPlayer src={audioPath} style={{ margin: '12px 0' }} />
      )}
      <div className="content-detail-body" style={{ marginTop: '20px', fontSize: '15px', lineHeight: 1.7, color: 'var(--gray-800, #1f2937)' }}
        dangerouslySetInnerHTML={{ __html: blog.content ?? '<p><em>Aucun contenu.</em></p>' }} />
    </>
  );

  const aside = (
    <div>
      <p className="eyebrow">Aperçu</p>
      <p style={{ fontSize: '13px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>
        Ceci est un aperçu de votre {typeLabel.toLowerCase()}, tel qu&apos;il apparaîtra une fois publié.
      </p>
    </div>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '16px', maxWidth: '900px', width: '100%', padding: '24px 28px', overflow: 'hidden',
      }}>
        <ArticleLayout
          compact
          maxWidth="none"
          coverSrc={coverFailed ? null : (coverPath ?? `/api/education/blogs/${blog.id}/cover`)}
          onCoverError={() => setCoverFailed(true)}
          article={article}
          aside={aside}
        />
      </div>
    </div>
  );
}
