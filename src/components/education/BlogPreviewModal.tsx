'use client';

export type BlogPreviewData = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  tags?: string[] | null;
  freeTags?: string[] | null;
};

// Modale de prévisualisation d'un blog — partagée entre l'espace Rédacteur et la gestion admin.
export default function BlogPreviewModal({ blog, onClose, coverPath, audioPath }: {
  blog: BlogPreviewData;
  onClose: () => void;
  coverPath?: string;
  audioPath?: string;
}) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '16px', maxWidth: '760px', width: '100%', padding: '0', overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverPath ?? `/api/education/blogs/${blog.id}/cover`} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
        <div style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>{blog.title}</h1>
            <button type="button" onClick={onClose} style={{ border: 'none', background: 'var(--gray-100, #f3f4f6)', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', flexShrink: 0 }}>×</button>
          </div>
          {blog.description && <p style={{ color: 'var(--gray-600, #4b5563)', fontSize: '15px', marginTop: '8px' }}>{blog.description}</p>}
          {(blog.freeTags?.length || blog.tags?.length) ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '12px 0' }}>
              {[...(blog.tags ?? []), ...(blog.freeTags ?? [])].map((t) => (
                <span key={t} style={{ fontSize: '12px', color: 'var(--blue, #2563eb)', background: 'rgba(37,99,235,.07)', padding: '2px 8px', borderRadius: '20px' }}>#{t}</span>
              ))}
            </div>
          ) : null}
          {audioPath && (
            <audio controls src={audioPath} style={{ width: '100%', margin: '12px 0', borderRadius: '8px' }} />
          )}
          <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200, #e5e7eb)', margin: '16px 0' }} />
          <div className="blog-preview" style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--gray-800, #1f2937)' }}
            dangerouslySetInnerHTML={{ __html: blog.content ?? '<p><em>Aucun contenu.</em></p>' }} />
        </div>
      </div>
      <style>{`
        .blog-preview h2 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
        .blog-preview h3 { font-size: 17px; font-weight: 700; margin: 12px 0 6px; }
        .blog-preview ul, .blog-preview ol { padding-left: 22px; }
        .blog-preview blockquote { border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280; }
        .blog-preview a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}
