'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAppRouter } from '@/components/ui/app-link';

type ForumPost = {
  postId: string; title: string; content: string; authorId: string; authorName?: string | null;
  numberOfLikes?: number | null; numberOfDislikes?: number | null;
  postLikes?: string[] | null; postDislikes?: string[] | null;
  commentCount?: number | null; creationDate?: string | null;
};
type ForumCommentaire = { commentaireId?: string | null; content: string; authorId: string; authorName?: string | null; creationDate?: string | null };
type ForumCategorie = { categorieId: string; categorieName: string };

function formatDate(s?: string | null) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
}

function PostThread({ post, userId, onDelete }: { post: ForumPost; userId?: string; onDelete: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ForumCommentaire[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [liked, setLiked] = useState(post.postLikes?.includes(userId ?? '') ?? false);
  const [likes, setLikes] = useState(post.numberOfLikes ?? 0);
  const [disliked, setDisliked] = useState(post.postDislikes?.includes(userId ?? '') ?? false);
  const [dislikes, setDislikes] = useState(post.numberOfDislikes ?? 0);

  const loadComments = async () => {
    if (open) { setOpen(false); return; }
    try {
      const data = await apiFetch<ForumCommentaire[]>(`/api/forum/commentaires/post/${post.postId}`);
      setComments(Array.isArray(data) ? data : []);
    } catch { setComments([]); }
    setOpen(true);
  };

  const toggleLike = async () => {
    try {
      await apiFetch(`/api/forum/posts/${post.postId}/like`, { method: 'POST' });
      if (liked) { setLikes((n) => n - 1); setLiked(false); }
      else { setLikes((n) => n + 1); setLiked(true); if (disliked) { setDislikes((n) => n - 1); setDisliked(false); } }
    } catch { /* best-effort */ }
  };

  const toggleDislike = async () => {
    try {
      await apiFetch(`/api/forum/posts/${post.postId}/dislike`, { method: 'POST' });
      if (disliked) { setDislikes((n) => n - 1); setDisliked(false); }
      else { setDislikes((n) => n + 1); setDisliked(true); if (liked) { setLikes((n) => n - 1); setLiked(false); } }
    } catch { /* best-effort */ }
  };

  const submitComment = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<ForumCommentaire>(`/api/forum/commentaires/post/${post.postId}`, { method: 'POST', body: { content: draft.trim() } });
      setComments((prev) => [...prev, created]);
      setDraft('');
    } catch { /* best-effort */ }
    finally { setBusy(false); }
  };

  const deleteComment = async (id: string) => {
    setComments((prev) => prev.filter((c) => c.commentaireId !== id));
    try { await apiFetch(`/api/forum/commentaires/${id}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  return (
    <div
      style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: '12px', padding: '18px 20px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,.04)', transition: 'box-shadow .15s, transform .15s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,.04)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '2px' }}>{post.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '6px' }}>Par {post.authorName || 'Utilisateur'}</div>
          <div style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post.content}</div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '10px', alignItems: 'center' }}>
            <button type="button" onClick={toggleLike} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: liked ? 'var(--accent)' : 'var(--gray-500)' }}>
              <svg width="14" height="14" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>
              {likes}
            </button>
            <button type="button" onClick={toggleDislike} style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: disliked ? 'var(--accent)' : 'var(--gray-500)' }}>
              <svg width="14" height="14" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>
              {dislikes}
            </button>
            <button type="button" onClick={loadComments} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-500)', fontWeight: 600 }}>
              {open ? 'Masquer' : `Commentaires (${post.commentCount ?? 0})`}
            </button>
            {post.authorId === userId && (
              <button type="button" onClick={() => onDelete(post.postId)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>Supprimer</button>
            )}
            <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginLeft: 'auto' }}>{formatDate(post.creationDate)}</span>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--gray-100)' }}>
          {comments.map((c) => (
            <div key={c.commentaireId ?? c.creationDate} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--gray-50)' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '2px' }}>{c.authorName || 'Utilisateur'}</div>
                <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{c.content}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(c.creationDate)}</span>
                {(c.authorId === userId) && (
                  <button type="button" onClick={() => deleteComment(c.commentaireId!)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--accent)' }}>Supprimer</button>
                )}
              </div>
            </div>
          ))}
          {comments.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: '13px', margin: '8px 0' }}>Aucun commentaire.</p>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un commentaire…"
              onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
              style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '7px 12px', fontSize: '13px' }} />
            <button type="button" onClick={submitComment} disabled={!draft.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '0 14px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: draft.trim() ? 1 : 0.5 }}>
              Envoyer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Le KSM ne garantit aucun ordre sur les posts (pas d'ORDER BY côté repo) : on trie côté client
// du plus ancien au plus récent. Les posts sans date remontent en tête (0), stable pour le reste.
function sortByDateAsc(posts: ForumPost[]): ForumPost[] {
  return [...posts].sort((a, b) => {
    const ta = a.creationDate ? new Date(a.creationDate).getTime() : 0;
    const tb = b.creationDate ? new Date(b.creationDate).getTime() : 0;
    return ta - tb;
  });
}

export default function ForumGroupView({ groupId, userId }: { groupId: string; userId?: string }) {
  const router = useAppRouter();
  const [group, setGroup] = useState<{ groupId: string; name: string; description?: string | null } | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selCats, setSelCats] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch<any>(`/api/forum/groups/${groupId}`).catch(() => null),
      apiFetch<ForumPost[]>(`/api/forum/posts/group/${groupId}`).catch(() => []),
      apiFetch<ForumCategorie[]>(`/api/forum/categories/group/${groupId}`).catch(() => []),
    ]).then(([g, p, c]) => {
      setGroup(g);
      setPosts(sortByDateAsc(Array.isArray(p) ? p : []));
      setCategories(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, [groupId]);

  const deletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
    try { await apiFetch(`/api/forum/posts/${postId}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  const submitPost = async () => {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<ForumPost>('/api/forum/posts', { method: 'POST', body: { title: title.trim(), content: content.trim(), groupId, categoriesIds: selCats } });
      // Tri du plus ancien au plus récent : un post neuf va en fin de liste.
      setPosts((prev) => [...prev, created]);
      setTitle(''); setContent(''); setSelCats([]); setShowForm(false);
    } catch { /* best-effort */ }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button type="button" onClick={() => router.back()} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '6px 12px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> Retour</button>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 800, margin: 0, flex: 1 }}>{group?.name ?? 'Fil de discussion'}</h1>
        <button type="button" onClick={() => setShowForm((v) => !v)} style={{ border: 'none', borderRadius: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showForm ? 'Annuler' : '+ Nouveau post'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Nouveau post</h3>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre *" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Contenu *" rows={4} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
          {categories.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '6px' }}>Catégories</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {categories.map((c) => (
                  <button key={c.categorieId} type="button" onClick={() => setSelCats((prev) => prev.includes(c.categorieId) ? prev.filter((id) => id !== c.categorieId) : [...prev, c.categorieId])}
                    style={{ border: `1px solid ${selCats.includes(c.categorieId) ? 'var(--accent)' : 'var(--gray-200)'}`, borderRadius: '20px', padding: '3px 12px', fontSize: '12px', background: selCats.includes(c.categorieId) ? 'rgba(239,68,68,.08)' : '#fff', color: selCats.includes(c.categorieId) ? 'var(--accent)' : 'var(--gray-600)', cursor: 'pointer', fontWeight: 600 }}>
                    {c.categorieName}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" onClick={submitPost} disabled={!title.trim() || !content.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: (title.trim() && content.trim()) ? 1 : 0.5, alignSelf: 'flex-start' }}>
            {busy ? 'Publication…' : 'Publier'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : posts.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun post dans ce groupe.</p>
      ) : (
        posts.map((p) => <PostThread key={p.postId} post={p} userId={userId} onDelete={deletePost} />)
      )}
    </div>
  );
}
