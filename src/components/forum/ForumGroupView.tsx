'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink, useAppRouter } from '@/components/ui/app-link';
import UserAvatar from '@/components/ui/UserAvatar';

type ForumPost = {
  postId: string; content: string; authorId: string; authorName?: string | null;
  numberOfLikes?: number | null; numberOfDislikes?: number | null;
  postLikes?: string[] | null; postDislikes?: string[] | null;
  commentCount?: number | null; creationDate?: string | null;
};
type ForumCommentaire = { commentaireId?: string | null; content: string; authorId: string; authorName?: string | null; creationDate?: string | null };
type ForumCategorie = { categorieId: string; categorieName: string };
type MemberName = { userId: string; userName?: string | null };
type DiscussionGroup = { groupId: string; name: string; description?: string | null; type?: string; members?: string[] | null; memberNames?: MemberName[] | null; creatorId?: string | null; parentCommunityId?: string | null };
type JoinRequest = { requestId: string; userId: string; userName?: string | null; status?: string | null; createdAt?: string | null };

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <UserAvatar name={post.authorName || 'Utilisateur'} userId={post.authorId} size={28} fontSize={11} />
            <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Par {post.authorName || 'Utilisateur'}</span>
          </div>
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
              <div style={{ display: 'flex', gap: '8px', minWidth: 0 }}>
                <UserAvatar name={c.authorName || 'Utilisateur'} userId={c.authorId} size={24} fontSize={10} style={{ marginTop: '2px' }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', marginBottom: '2px' }}>{c.authorName || 'Utilisateur'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>{c.content}</div>
                </div>
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

// Panneau de gestion des adhésions — affiché uniquement au créateur d'une COMMUNITY.
// TOUJOURS visible (états chargement / erreur / vide / liste) pour que le créateur dispose d'une
// interface même sans demande en attente. Approuver = ajout dans `members` côté KSM ; rejeter = clôture.
function JoinRequestsPanel({ groupId, members, onApproved }: { groupId: string; members: MemberName[]; onApproved: () => void }) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiFetch<JoinRequest[]>(`/api/forum/groups/${groupId}/requests`);
        if (!cancelled) { setRequests(Array.isArray(d) ? d : []); setLoadError(false); }
      } catch {
        if (!cancelled) { setRequests([]); setLoadError(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  const act = async (requestId: string, action: 'approve' | 'reject') => {
    setBusyId(requestId);
    try {
      await apiFetch(`/api/forum/groups/requests/${requestId}/${action}`, { method: 'PUT' });
      setRequests((prev) => prev?.filter((r) => r.requestId !== requestId) ?? prev);
      if (action === 'approve') onApproved();
    } catch { /* best-effort */ }
    finally { setBusyId(null); }
  };

  const pending = (requests ?? []).filter((r) => !r.status || r.status === 'PENDING');

  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 700 }}>Demandes d&apos;adhésion{pending.length > 0 ? ` (${pending.length})` : ''}</h3>
      {requests === null ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-400)' }}>Chargement…</p>
      ) : loadError ? (
        <p style={{ margin: 0, fontSize: '13px', color: '#B91C1C' }}>Impossible de charger les demandes. Rechargez la page.</p>
      ) : pending.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-400)' }}>Aucune demande en attente.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pending.map((r) => (
            <div key={r.requestId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', border: '1px solid var(--gray-100)', borderRadius: '8px' }}>
              <UserAvatar name={r.userName || 'Utilisateur'} userId={r.userId} size={28} fontSize={11} />
              <span style={{ flex: 1, minWidth: 0, fontSize: '13px', color: 'var(--gray-700)' }}>{r.userName || 'Utilisateur'}</span>
              <button type="button" disabled={busyId === r.requestId} onClick={() => act(r.requestId, 'approve')} style={{ border: 'none', borderRadius: '7px', padding: '6px 12px', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: busyId === r.requestId ? 0.5 : 1 }}>Approuver</button>
              <button type="button" disabled={busyId === r.requestId} onClick={() => act(r.requestId, 'reject')} style={{ border: '1px solid var(--gray-200)', borderRadius: '7px', padding: '6px 12px', background: '#fff', color: 'var(--gray-600)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: busyId === r.requestId ? 0.5 : 1 }}>Rejeter</button>
            </div>
          ))}
        </div>
      )}

      {/* Membres actuels de la communauté */}
      <h4 style={{ margin: '16px 0 8px', fontSize: '13px', fontWeight: 700, color: 'var(--gray-600)' }}>Membres ({members.length})</h4>
      {members.length === 0 ? (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--gray-400)' }}>Aucun membre pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {members.map((m) => (
            <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 10px 5px 6px', border: '1px solid var(--gray-100)', borderRadius: '20px' }}>
              <UserAvatar name={m.userName || 'Utilisateur'} userId={m.userId} size={22} fontSize={9} />
              <span style={{ fontSize: '12px', color: 'var(--gray-700)' }}>{m.userName || 'Utilisateur'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vue Communauté (conteneur) ──
// Une COMMUNITY n'a pas de posts : elle liste ses forums enfants + gère l'adhésion. Le créateur y
// ajoute des forums (auto-validés côté KSM) et traite les demandes d'adhésion.
function CommunityView({ group, userId }: { group: DiscussionGroup; userId?: string }) {
  const router = useAppRouter();
  const [forums, setForums] = useState<DiscussionGroup[] | null>(null);
  const [joinState, setJoinState] = useState<'idle' | 'requested' | 'error'>('idle');
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const isCreator = !!userId && group.creatorId === userId;
  const isMember = isCreator || (!!userId && (group.members ?? []).includes(userId));

  const loadForums = () => {
    apiFetch<DiscussionGroup[]>(`/api/forum/groups/${group.groupId}/forums`)
      .then((d) => setForums(Array.isArray(d) ? d : []))
      .catch(() => setForums([]));
  };
  useEffect(() => { loadForums(); }, [group.groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistance de l'état « Demande envoyée » : la demande vit côté KSM, pas dans ce composant.
  // Pour un non-membre, on interroge les demandes du groupe au montage ; si l'utilisateur y figure,
  // on repositionne joinState='requested' (sinon le bouton « Demander à rejoindre » réapparaîtrait
  // après chaque rechargement/reconnexion).
  useEffect(() => {
    if (isMember || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const reqs = await apiFetch<JoinRequest[]>(`/api/forum/groups/${group.groupId}/requests`);
        if (!cancelled && Array.isArray(reqs) && reqs.some((r) => r.userId === userId && (!r.status || r.status === 'PENDING'))) {
          setJoinState('requested');
        }
      } catch { /* état par défaut 'idle' */ }
    })();
    return () => { cancelled = true; };
  }, [group.groupId, isMember, userId]);

  // Membres à afficher au créateur : noms résolus par le BFF (memberNames) ou repli sur les UUID.
  const memberList: MemberName[] = group.memberNames ?? (group.members ?? []).map((uid) => ({ userId: uid }));

  const requestToJoin = async () => {
    try {
      await apiFetch(`/api/forum/groups/${group.groupId}/requests`, { method: 'POST' });
      setJoinState('requested');
    } catch { setJoinState('error'); }
  };

  const createForum = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/forum/groups', { method: 'POST', body: { name: newName.trim(), type: 'FORUM', parentCommunityId: group.groupId } });
      setNewName(''); setShowForm(false);
      loadForums();
    } catch { /* best-effort */ }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <button type="button" onClick={() => router.back()} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '6px 12px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> Retour</button>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 800, margin: 0, flex: 1 }}>{group.name}</h1>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '3px 10px', borderRadius: '20px' }}>Communauté</span>
      </div>
      {group.description && <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--gray-600)' }}>{group.description}</p>}

      {/* Adhésion (non-membre) */}
      {!isMember && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>Communauté privée</div>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>Rejoignez-la pour accéder à tous ses forums.</div>
          </div>
          {joinState === 'requested' ? (
            <span style={{ padding: '9px 16px', borderRadius: '20px', background: '#FEF9EC', color: '#B45309', fontSize: '13px', fontWeight: 700 }}>Demande envoyée</span>
          ) : (
            <button type="button" onClick={requestToJoin} style={{ border: 'none', borderRadius: '8px', padding: '10px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Demander à rejoindre</button>
          )}
          {joinState === 'error' && <p style={{ width: '100%', margin: '4px 0 0', fontSize: '13px', color: '#B91C1C' }}>Échec de l&apos;envoi. Réessayez.</p>}
        </div>
      )}

      {/* Gestion (créateur) : demandes d'adhésion + ajout de forums */}
      {isCreator && <JoinRequestsPanel groupId={group.groupId} members={memberList} onApproved={() => { /* l'adhésion est côté KSM */ }} />}
      {isCreator && (
        <div style={{ marginBottom: '18px' }}>
          {showForm ? (
            <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du forum *" onKeyDown={(e) => { if (e.key === 'Enter') createForum(); }}
                style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
              <button type="button" onClick={createForum} disabled={!newName.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', opacity: newName.trim() ? 1 : 0.5 }}>
                {busy ? 'Création…' : 'Créer'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setNewName(''); }} style={{ border: 'none', background: 'none', color: 'var(--gray-500)', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowForm(true)} style={{ border: 'none', borderRadius: '8px', padding: '9px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>+ Nouveau forum</button>
          )}
        </div>
      )}

      {/* Liste des forums de la communauté */}
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '10px' }}>Forums de la communauté</h3>
      {forums === null ? (
        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : forums.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>Aucun forum pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {forums.map((f) => (
            <AppLink key={f.groupId} href={`/forums/${f.groupId}`} style={{ display: 'block', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px 18px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{f.name}</div>
              {f.description && <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '3px' }}>{f.description}</div>}
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vue Forum (fil de posts) ──
// Un forum autonome est ouvert. Un forum ENFANT (parentCommunityId) hérite du gating de sa
// communauté parente : on charge la communauté et on vérifie l'appartenance.
function ForumThread({ group, userId }: { group: DiscussionGroup; userId?: string }) {
  const router = useAppRouter();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [categories, setCategories] = useState<ForumCategorie[]>([]);
  const [parent, setParent] = useState<DiscussionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [selCats, setSelCats] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [joinState, setJoinState] = useState<'idle' | 'requested' | 'error'>('idle');

  const parentId = group.parentCommunityId ?? null;

  useEffect(() => {
    Promise.all([
      apiFetch<ForumPost[]>(`/api/forum/posts/group/${group.groupId}`).catch(() => []),
      apiFetch<ForumCategorie[]>(`/api/forum/categories/group/${group.groupId}`).catch(() => []),
      parentId ? apiFetch<DiscussionGroup>(`/api/forum/groups/${parentId}`).catch(() => null) : Promise.resolve(null),
    ]).then(([p, c, par]) => {
      setPosts(sortByDateAsc(Array.isArray(p) ? p : []));
      setCategories(Array.isArray(c) ? c : []);
      setParent(par);
      setLoading(false);
    });
  }, [group.groupId, parentId]);

  // Forum enfant : accès hérité de la communauté parente. Forum autonome : ouvert.
  const isMemberOfParent = !!parent && !!userId && (parent.creatorId === userId || (parent.members ?? []).includes(userId));
  const locked = !!parentId && !isMemberOfParent;

  // Persistance de « Demande envoyée » sur un forum enfant : la demande porte sur la communauté
  // parente. Si l'utilisateur a déjà une demande en attente, on repositionne joinState au montage.
  useEffect(() => {
    if (!parentId || isMemberOfParent || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const reqs = await apiFetch<JoinRequest[]>(`/api/forum/groups/${parentId}/requests`);
        if (!cancelled && Array.isArray(reqs) && reqs.some((r) => r.userId === userId && (!r.status || r.status === 'PENDING'))) {
          setJoinState('requested');
        }
      } catch { /* état par défaut 'idle' */ }
    })();
    return () => { cancelled = true; };
  }, [parentId, isMemberOfParent, userId]);

  const requestToJoinParent = async () => {
    if (!parentId) return;
    try {
      await apiFetch(`/api/forum/groups/${parentId}/requests`, { method: 'POST' });
      setJoinState('requested');
    } catch { setJoinState('error'); }
  };

  const deletePost = async (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.postId !== postId));
    try { await apiFetch(`/api/forum/posts/${postId}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  const submitPost = async () => {
    if (!content.trim() || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<ForumPost>('/api/forum/posts', { method: 'POST', body: { content: content.trim(), groupId: group.groupId, categoriesIds: selCats } });
      setPosts((prev) => [...prev, created]);
      setContent(''); setSelCats([]); setShowForm(false);
    } catch { /* best-effort */ }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: parentId ? '6px' : '20px' }}>
        <button type="button" onClick={() => router.back()} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '6px 12px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}> Retour</button>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 800, margin: 0, flex: 1 }}>{group.name}</h1>
        {!loading && !locked && (
          <button type="button" onClick={() => setShowForm((v) => !v)} style={{ border: 'none', borderRadius: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            {showForm ? 'Annuler' : '+ Nouveau post'}
          </button>
        )}
      </div>
      {parentId && parent && (
        <div style={{ marginBottom: '18px', fontSize: '12.5px', color: 'var(--gray-500)' }}>
          Forum de la communauté <AppLink href={`/forums/${parentId}`} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>{parent.name}</AppLink>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : locked ? (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '44px 24px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <svg width="24" height="24" fill="none" stroke="var(--gray-500)" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-d)' }}>Forum privé</h2>
          <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--gray-500)', maxWidth: 400, marginInline: 'auto' }}>
            Ce forum appartient à la communauté {parent ? <strong>{parent.name}</strong> : 'privée'}. Rejoignez la communauté pour y accéder — l&apos;adhésion vaut pour tous ses forums.
          </p>
          {joinState === 'requested' ? (
            <span style={{ display: 'inline-block', padding: '9px 18px', borderRadius: '20px', background: '#FEF9EC', color: '#B45309', fontSize: '13px', fontWeight: 700 }}>
              Demande envoyée — en attente d&apos;approbation
            </span>
          ) : (
            <button type="button" onClick={requestToJoinParent} style={{ border: 'none', borderRadius: '8px', padding: '11px 22px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
              Demander à rejoindre la communauté
            </button>
          )}
          {joinState === 'error' && (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#B91C1C' }}>Échec de l&apos;envoi de la demande. Réessayez.</p>
          )}
        </div>
      ) : (
        <>
          {showForm && (
            <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Nouveau post</h3>
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
              <button type="button" onClick={submitPost} disabled={!content.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: content.trim() ? 1 : 0.5, alignSelf: 'flex-start' }}>
                {busy ? 'Publication…' : 'Publier'}
              </button>
            </div>
          )}

          {posts.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun post dans ce forum.</p>
          ) : (
            posts.map((p) => <PostThread key={p.postId} post={p} userId={userId} onDelete={deletePost} />)
          )}
        </>
      )}
    </div>
  );
}

// Dispatcher : charge le groupe puis rend la vue Communauté (conteneur) ou Forum (posts).
export default function ForumGroupView({ groupId, userId }: { groupId: string; userId?: string }) {
  const [group, setGroup] = useState<DiscussionGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DiscussionGroup>(`/api/forum/groups/${groupId}`)
      .then((g) => { if (!cancelled) setGroup(g); })
      .catch(() => { if (!cancelled) setGroup(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--gray-400)' }}>Chargement…</div>;
  }
  if (!group) {
    return <div style={{ maxWidth: 640, margin: '40px auto', padding: '14px 16px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontSize: 14 }}>Groupe introuvable.</div>;
  }
  return group.type === 'COMMUNITY'
    ? <CommunityView group={group} userId={userId} />
    : <ForumThread group={group} userId={userId} />;
}
