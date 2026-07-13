'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { coverPathFor } from './contentLinks';
import CoverFallback from './CoverFallback';
import ArticleLayout from './ArticleLayout';
import AudioPlayer from './AudioPlayer';
import { Link, useRouter } from '@/i18n/navigation';
import { useSessionUser } from '@/components/providers/session-provider';

export type DetailContentType = 'BLOG' | 'PODCAST' | 'COURSE';

type ContentDetail = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  transcript?: string | null;
  authorId?: string | null;
  domain?: string | null;
  status?: string | null;
  freeTags?: string[] | null;
  tags?: string[] | null;
  readingTime?: number | null;
  publishedAt?: string | null;
  createdAt?: string | null;
};

type AdminUser = { userId: string; firstName: string | null; lastName: string | null; email: string };

type RatingStats = { totalLikes: number; totalDislikes: number; hasLiked: boolean; hasDisliked: boolean };

type CommentEntity = { id: string; content: string; commentByUser: string; commentByName?: string | null; createdAt?: string | null };
type CommentReplyEntity = { id: string; content: string; replyByUserId: string; replyByName?: string | null; createdAt?: string | null };
type ApprovedRedacteur = { id: string; email: string; nom: string; prenom: string } | null;

const BASE_PATH: Record<DetailContentType, string> = {
  BLOG: '/api/education/blogs',
  PODCAST: '/api/education/podcasts',
  COURSE: '/api/education/courses',
};

const TYPE_LABELS: Record<DetailContentType, string> = {
  BLOG: 'Article',
  PODCAST: 'Podcast',
  COURSE: 'Cours',
};

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function ContentDetailView({ contentType, id }: { contentType: DetailContentType; id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<ContentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const supportsRatings = true; // Blogs, podcasts et cours peuvent tous être évalués (like/dislike + commentaires).
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [comments, setComments] = useState<CommentEntity[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [openReplies, setOpenReplies] = useState<Record<string, CommentReplyEntity[] | undefined>>({});
  const [replyFormOpen, setReplyFormOpen] = useState<Record<string, boolean>>({});
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [authorRedacteur, setAuthorRedacteur] = useState<ApprovedRedacteur>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [modalEmail, setModalEmail] = useState('');

  const sessionUser = useSessionUser();

  // Follow states
  const [followCounts, setFollowCounts] = useState<{ followers: number; following: number; isFollowing: boolean } | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  // Course states
  const [courseProgress, setCourseProgress] = useState<{ percent: number; completedUnitIds: string[]; enrolled: boolean } | null>(null);
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseUnits, setCourseUnits] = useState<any[]>([]);

  useEffect(() => {
    if (!item?.authorId) return;
    let cancelled = false;
    apiFetch<{ followers: number; following: number; isFollowing: boolean }>(`/api/follows/${item.authorId}`)
      .then((data) => {
        if (!cancelled) setFollowCounts(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item?.authorId]);

  useEffect(() => {
    if (contentType !== 'COURSE' || !id) return;
    let cancelled = false;
    apiFetch<any[]>(`/api/education/courses/${id}/units`)
      .then((units) => {
        if (!cancelled) setCourseUnits(units);
      })
      .catch(() => {});

    apiFetch<{ percent: number; completedUnitIds: string[]; enrolled: boolean }>(`/api/education/courses/${id}/progress`)
      .then((data) => {
        if (!cancelled) setCourseProgress(data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [contentType, id]);

  async function handleFollowToggle() {
    if (!item?.authorId || followBusy || !followCounts) return;
    setFollowBusy(true);
    try {
      if (followCounts.isFollowing) {
        await apiFetch(`/api/follows/${item.authorId}`, { method: 'DELETE' });
        setFollowCounts(prev => prev ? { ...prev, followers: prev.followers - 1, isFollowing: false } : null);
      } else {
        await apiFetch(`/api/follows/${item.authorId}`, { method: 'POST' });
        setFollowCounts(prev => prev ? { ...prev, followers: prev.followers + 1, isFollowing: true } : null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowBusy(false);
    }
  }

  async function handleEnroll() {
    if (contentType !== 'COURSE' || courseBusy || !id) return;
    setCourseBusy(true);
    try {
      await apiFetch(`/api/education/courses/${id}/enroll`, { method: 'POST' });
      const data = await apiFetch<{ percent: number; completedUnitIds: string[]; enrolled: boolean }>(`/api/education/courses/${id}/progress`);
      setCourseProgress(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCourseBusy(false);
    }
  }

  async function handleCompleteUnit(unitId: string) {
    if (contentType !== 'COURSE' || courseBusy || !id) return;
    setCourseBusy(true);
    try {
      await apiFetch(`/api/education/courses/units/${unitId}/complete`, { method: 'POST' });
      const data = await apiFetch<{ percent: number; completedUnitIds: string[]; enrolled: boolean }>(`/api/education/courses/${id}/progress`);
      setCourseProgress(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCourseBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setItem(null);
      setError(null);
      setCoverFailed(false);
      try {
        const data = await apiFetch<ContentDetail>(`${BASE_PATH[contentType]}/${id}`);
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [contentType, id]);

  // Résolution du nom d'auteur — best-effort, réservé aux viewers admin (seuls autorisés
  // sur /api/admin/users) ; échoue silencieusement pour rédacteur/lecteur (repli sur authorRedacteur
  // ci-dessous si l'auteur a une newsletter, sinon id tronqué affiché).
  useEffect(() => {
    if (!item?.authorId) return;
    let cancelled = false;
    (async () => {
      try {
        const users = await apiFetch<AdminUser[]>('/api/admin/users');
        if (cancelled) return;
        const u = users.find((x) => x.userId === item.authorId);
        if (u) {
          const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          setAuthorName(full || u.email);
        }
      } catch {
        /* non-admin : repli sur authorRedacteur (voir effet suivant) ou id tronqué */
      }
    })();
    return () => { cancelled = true; };
  }, [item?.authorId]);

  // Le bouton « S'abonner à ma newsletter » n'apparaît que si l'auteur de ce contenu est
  // lui-même un rédacteur de newsletter approuvé — valable pour TOUS les types de contenu,
  // y compris les cours (ne dépend pas de supportsRatings, propriété réservée aux ratings/commentaires).
  useEffect(() => {
    if (!item?.authorId) return;
    let cancelled = false;
    apiFetch<ApprovedRedacteur>(`/api/newsletter/redacteurs/by-user/${item.authorId}`)
      .then((r) => {
        if (cancelled || !r) return;
        setAuthorRedacteur(r);
        // Repli nom d'auteur pour les viewers non-admin (donnée déjà disponible ici, sans appel
        // supplémentaire) — ne remplace pas une résolution admin déjà réussie.
        setAuthorName((cur) => cur ?? ([r.prenom, r.nom].filter(Boolean).join(' ').trim() || cur));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item?.authorId]);

  // Reflète un abonnement déjà existant à l'auteur (sinon le bouton repart toujours à zéro).
  useEffect(() => {
    if (!authorRedacteur) return;
    let cancelled = false;
    apiFetch<{ id: string }[]>('/api/newsletter/subscriptions/redacteurs')
      .then((mine) => {
        if (!cancelled && Array.isArray(mine) && mine.some((r) => r.id === authorRedacteur.id)) {
          setSubscribed(true);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authorRedacteur]);

  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: item?.title, url: window.location.href }); } catch { /* annulé */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* presse-papiers indisponible */ }
  };

  const subscribeToRedacteur = () => {
    if (!authorRedacteur || subscribeBusy) return;
    setModalEmail(sessionUser?.email ?? '');
    setShowSubscribeModal(true);
  };

  const handleSubscribeSubmit = async () => {
    if (!authorRedacteur || subscribeBusy || !modalEmail.trim()) return;
    setSubscribeBusy(true);
    try {
      await apiFetch(`/api/newsletter/subscriptions/redacteurs/${authorRedacteur.id}`, { method: 'POST', body: { email: modalEmail.trim() } });
      setSubscribed(true);
      setShowSubscribeModal(false);
    } catch { /* best-effort */ }
    finally { setSubscribeBusy(false); }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const favs = await apiFetch<{ id: string; contentType?: string | null }[]>('/api/education/favorites');
        if (!cancelled && Array.isArray(favs)) {
          setFavorited(favs.some((f) => f.id === id && (f.contentType ?? '').toUpperCase() === contentType));
        }
      } catch { /* favoris indisponibles */ }
    })();
    return () => { cancelled = true; };
  }, [contentType, id]);

  const toggleFavorite = async () => {
    if (!sessionUser) { router.push('/auth/login'); return; }
    if (busy) return;
    setBusy(true);
    const next = !favorited;
    setFavorited(next);
    try {
      await apiFetch('/api/education/favorites/toggle', { method: 'POST', body: { entityId: id, contentType } });
    } catch {
      setFavorited(!next);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!supportsRatings) return;
    let cancelled = false;
    apiFetch<RatingStats>(`/api/ratings/stats?entityId=${id}`)
      .then((s) => { if (!cancelled) setRatingStats(s); })
      .catch(() => {});
    apiFetch<CommentEntity[]>(`/api/ratings/comments?entityId=${id}`)
      .then((c) => { if (!cancelled) setComments(Array.isArray(c) ? c : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [supportsRatings, id]);

  const sendReaction = async (isLike: boolean) => {
    if (!sessionUser) { router.push('/auth/login'); return; }
    if (ratingBusy || !ratingStats) return;
    setRatingBusy(true);
    const prev = ratingStats;
    // Optimistic update — bascule like/dislike mutuellement exclusifs (toggleLike/toggleDislike côté backend).
    const next: RatingStats = { ...prev };
    if (isLike) {
      next.hasLiked = !prev.hasLiked;
      next.totalLikes = prev.totalLikes + (next.hasLiked ? 1 : -1);
      if (next.hasLiked && prev.hasDisliked) { next.hasDisliked = false; next.totalDislikes = prev.totalDislikes - 1; }
    } else {
      next.hasDisliked = !prev.hasDisliked;
      next.totalDislikes = prev.totalDislikes + (next.hasDisliked ? 1 : -1);
      if (next.hasDisliked && prev.hasLiked) { next.hasLiked = false; next.totalLikes = prev.totalLikes - 1; }
    }
    setRatingStats(next);
    try {
      await apiFetch('/api/ratings/like-or-dislike', { method: 'POST', body: { entityId: id, entityType: contentType, isLike } });
    } catch {
      setRatingStats(prev);
    } finally {
      setRatingBusy(false);
    }
  };

  const submitComment = async () => {
    const content = newComment.trim();
    if (!content || commentBusy) return;
    setCommentBusy(true);
    try {
      const created = await apiFetch<CommentEntity>('/api/ratings/comments', {
        method: 'POST',
        body: { content, entityId: id, entityType: contentType },
      });
      setComments((prev) => [created, ...prev]);
      setNewComment('');
    } catch { /* erreur silencieuse, le texte reste pour réessayer */ }
    finally { setCommentBusy(false); }
  };

  const deleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    try { await apiFetch(`/api/ratings/comments/${commentId}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  const loadReplies = async (commentId: string) => {
    if (openReplies[commentId] !== undefined) return;
    try {
      const replies = await apiFetch<CommentReplyEntity[]>(`/api/ratings/comments/${commentId}/replies`);
      setOpenReplies((prev) => ({ ...prev, [commentId]: Array.isArray(replies) ? replies : [] }));
    } catch {
      setOpenReplies((prev) => ({ ...prev, [commentId]: [] }));
    }
  };

  const hideReplies = (commentId: string) => {
    setOpenReplies((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
    setReplyFormOpen((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const openReplyForm = async (commentId: string) => {
    await loadReplies(commentId);
    setReplyFormOpen((prev) => ({ ...prev, [commentId]: true }));
  };

  const submitReply = async (commentId: string) => {
    const content = (replyDrafts[commentId] ?? '').trim();
    if (!content) return;
    try {
      const created = await apiFetch<CommentReplyEntity>(`/api/ratings/comments/${commentId}/replies`, {
        method: 'POST',
        body: { content },
      });
      setOpenReplies((prev) => ({ ...prev, [commentId]: [...(prev[commentId] ?? []), created] }));
      setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
      setReplyFormOpen((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
    } catch { /* best-effort */ }
  };

  const deleteReply = async (commentId: string, replyId: string) => {
    setOpenReplies((prev) => ({ ...prev, [commentId]: (prev[commentId] ?? []).filter((r) => r.id !== replyId) }));
    try { await apiFetch(`/api/ratings/replies/${replyId}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  if (error) {
    return (
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '14px 16px', borderRadius: '10px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' }}>
        {error}
      </div>
    );
  }

  if (!item) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Chargement…</div>;
  }

  const authorLabel = authorName ?? (item.authorId ? `${item.authorId.slice(0, 8)}…` : 'Auteur inconnu');
  const body = contentType === 'PODCAST' ? item.transcript : item.content;
  const allTags = [...(item.tags ?? []), ...(item.freeTags ?? [])];
  // Le contenu réel (TipTap) est déjà du HTML valide ; seules les données de démo (texte
  // brut avec \n\n) ont besoin d'être reformatées en paragraphes.
  const looksLikeHtml = !!body && /<[a-z][\s\S]*>/i.test(body);
  const bodyHtml = body
    ? looksLikeHtml
      ? body
      : body.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('')
    : '<p><em>Aucun contenu.</em></p>';

  const showFollow = !!(followCounts && sessionUser && sessionUser.id !== item.authorId);
  const showSubscribe = !!(sessionUser && authorRedacteur);

  const articleContent = (
    <>
      {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {allTags.map((t) => <Tag key={t}>#{t}</Tag>)}
            </div>
          )}

          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--accent)', fontWeight: 700, margin: '0 0 18px' }}>
            {TYPE_LABELS[contentType]}
          </p>

          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(30px,4vw,44px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.01em', margin: 0, color: 'var(--dark, #111827)' }}>
            {item.title}
          </h1>

          {item.description && (
            <p style={{ marginTop: '18px', fontSize: '17px', lineHeight: 1.7, color: 'var(--gray-500, #6b7280)' }}>{item.description}</p>
          )}

          {contentType === 'PODCAST' && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4zM5 10v1a7 7 0 0014 0v-1M12 18v4M8 22h8"/></svg>
                </span>
                <span style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 700, color: 'var(--dark, #111827)' }}>Écouter l&apos;épisode</span>
              </div>
              <AudioPlayer src={`/api/education/podcasts/${id}/audio`} />
            </div>
          )}

          {/* Inscription / progression du cours — sans carte, sans dégradé */}
          {contentType === 'COURSE' && courseProgress && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--gray-100, #f3f4f6)' }}>
              {!courseProgress.enrolled ? (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--gray-500, #6b7280)', marginBottom: '14px' }}>
                    Inscrivez-vous pour suivre votre progression et valider les chapitres.
                  </p>
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={courseBusy}
                    style={{ border: 'none', borderRadius: '24px', padding: '10px 22px', fontSize: '13px', fontWeight: 700, background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
                  >
                    S&apos;inscrire au cours
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-700, #374151)' }}>Votre progression</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)' }}>{courseProgress.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--gray-100, #f3f4f6)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }}>
                    <div style={{ width: `${courseProgress.percent}%`, height: '100%', background: 'var(--accent)', borderRadius: '3px', transition: 'width .3s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {courseUnits.map((unit) => {
                      const isCompleted = courseProgress.completedUnitIds.includes(unit.id);
                      return (
                        <label id={`unit-${unit.id}`} key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: courseBusy ? 'default' : 'pointer', scrollMarginTop: '20px' }}>
                          <input type="checkbox" checked={isCompleted} onChange={() => handleCompleteUnit(unit.id)} disabled={courseBusy} style={{ width: '16px', height: '16px', cursor: 'inherit', accentColor: 'var(--accent)' }} />
                          <span style={{ color: isCompleted ? 'var(--gray-400, #9ca3af)' : 'var(--gray-800, #1f2937)', textDecoration: isCompleted ? 'line-through' : 'none' }}>{unit.title}</span>
                          {unit.duration && <span style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>· {unit.duration} min</span>}
                        </label>
                      );
                    })}
                    {courseUnits.length === 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>Aucun chapitre disponible pour le moment.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {contentType === 'PODCAST' && body && (
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 700, margin: '40px 0 0', color: 'var(--dark, #111827)' }}>Transcription</h2>
          )}
          <div
            className="content-detail-body"
            style={{ marginTop: contentType === 'PODCAST' ? '16px' : '40px', fontSize: '17px', lineHeight: 1.75, color: 'var(--gray-700, #374151)' }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* Réactions — inline, sans carte */}
          {supportsRatings && (
            <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <button
                type="button"
                onClick={() => sendReaction(true)}
                disabled={ratingBusy || !ratingStats}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: ratingBusy ? 'default' : 'pointer', padding: 0, color: ratingStats?.hasLiked ? 'var(--accent)' : 'var(--gray-500, #6b7280)', fontSize: '14px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={ratingStats?.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                J&apos;aime{ratingStats && ratingStats.totalLikes > 0 ? ` (${ratingStats.totalLikes})` : ''}
              </button>
              <button
                type="button"
                onClick={() => sendReaction(false)}
                disabled={ratingBusy || !ratingStats}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: ratingBusy ? 'default' : 'pointer', padding: 0, color: ratingStats?.hasDisliked ? 'var(--dark, #111827)' : 'var(--gray-500, #6b7280)', fontSize: '14px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={ratingStats?.hasDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ transform: 'scaleY(-1)' }}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                Je n&apos;aime pas
              </button>
            </div>
          )}
    </>
  );

  const asideContent = (
    <>
          <div style={{ marginBottom: '32px' }}>
            <p className="eyebrow">Auteur</p>
            <Link
              href={sessionUser ? `/profile/${item.authorId}` : '/auth/login'}
              onClick={(e) => { if (!sessionUser) { e.preventDefault(); router.push('/auth/login'); } }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary, #1F5FBF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: '14px', color: '#fff', flexShrink: 0 }}>
                {initials(authorLabel)}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: 'var(--dark, #111827)' }} className="hover:underline">{authorLabel}</p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>Auteur</p>
              </div>
            </Link>
          </div>

          {contentType === 'COURSE' && courseUnits.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <p className="eyebrow">Programme du cours</p>
              <p style={{ fontWeight: 700, fontSize: '14px', margin: '0 0 12px', color: 'var(--dark, #111827)' }}>{item.title}</p>
              <ol style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 0, padding: 0, listStyle: 'none' }}>
                {courseUnits.map((unit, i) => {
                  const isCompleted = courseProgress?.completedUnitIds.includes(unit.id);
                  return (
                    <li key={unit.id}>
                      <a
                        href={`#unit-${unit.id}`}
                        style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontSize: '13px', textDecoration: 'none', color: isCompleted ? 'var(--gray-400, #9ca3af)' : 'var(--gray-700, #374151)' }}
                      >
                        <span style={{ flexShrink: 0, color: 'var(--gray-400, #9ca3af)' }}>{i + 1}.</span>
                        <span style={{ textDecoration: isCompleted ? 'line-through' : 'none' }}>{unit.title}</span>
                      </a>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          <div style={{ marginBottom: '32px' }}>
            <p className="eyebrow">Publié</p>
            <p style={{ fontFamily: 'var(--font-d)', fontSize: '17px', margin: '0 0 4px', color: 'var(--dark, #111827)' }}>{formatDate(item.publishedAt ?? item.createdAt)}</p>
            {item.readingTime ? (
              <p style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                {item.readingTime} min de lecture
              </p>
            ) : null}
          </div>

          <div style={{ marginBottom: '32px' }}>
            <p className="eyebrow">Actions</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
              <button
                type="button"
                onClick={toggleFavorite}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '14px', color: favorited ? 'var(--accent)' : 'var(--gray-700, #374151)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>
                {favorited ? 'Enregistré' : 'Ajouter aux favoris'}
              </button>
              <button
                type="button"
                onClick={handleShare}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: '14px', color: 'var(--gray-700, #374151)' }}
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 3.9M15.4 6.6L8.6 10.5"/></svg>
                {shareCopied ? 'Lien copié !' : 'Partager'}
              </button>
            </div>
          </div>

          {(showFollow || showSubscribe) && (
            <div>
              <p className="eyebrow">Restez connecté</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {showFollow && (
                  <button
                    type="button"
                    onClick={handleFollowToggle}
                    disabled={followBusy}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                      padding: '8px 14px', borderRadius: '20px', cursor: 'pointer', transition: 'all .2s',
                      border: `1px solid ${followCounts?.isFollowing ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)'}`,
                      background: followCounts?.isFollowing ? 'var(--accent)' : 'transparent',
                      color: followCounts?.isFollowing ? '#fff' : 'var(--gray-700, #374151)',
                    }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
                    {followCounts?.isFollowing ? 'Suivi' : 'Suivre'}
                  </button>
                )}
                {showSubscribe && (
                  <button
                    type="button"
                    onClick={subscribeToRedacteur}
                    disabled={subscribeBusy || subscribed}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600,
                      padding: '8px 14px', borderRadius: '20px', cursor: subscribed ? 'default' : 'pointer', transition: 'all .2s',
                      border: `1px solid ${subscribed ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)'}`,
                      background: subscribed ? 'var(--accent)' : 'transparent',
                      color: subscribed ? '#fff' : 'var(--gray-700, #374151)',
                    }}
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                    {subscribed ? 'Abonné' : "S'abonner à ma newsletter"}
                  </button>
                )}
              </div>
            </div>
          )}
    </>
  );

  return (
    <div style={{ maxWidth: '1180px', margin: '0 auto', background: '#fff' }}>
      <ArticleLayout
        coverSrc={coverFailed ? null : coverPathFor(contentType, id)}
        onCoverError={() => setCoverFailed(true)}
        coverFallback={<CoverFallback id={id} title={item.title} contentType={contentType} />}
        article={articleContent}
        aside={asideContent}
      />

      {/* Commentaires — pleine largeur, sans carte */}
      {supportsRatings && (
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 18rem', columnGap: '64px', marginTop: '56px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '68ch' }}>
            <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, letterSpacing: '-.01em', margin: '0 0 24px', color: 'var(--dark, #111827)' }}>
              Commentaires {comments.length > 0 ? `(${comments.length})` : ''}
            </h2>

            {sessionUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire…"
                  style={{ flex: 1, background: 'var(--gray-50, #f8fafc)', border: 'none', borderRadius: '999px', padding: '12px 18px', fontSize: '14px', outline: 'none' }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={commentBusy || !newComment.trim()}
                  style={{ border: 'none', borderRadius: '999px', padding: '12px 22px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: commentBusy ? 'default' : 'pointer', opacity: newComment.trim() ? 1 : 0.6, whiteSpace: 'nowrap' }}
                >
                  Publier
                </button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--gray-500, #6b7280)', marginBottom: '28px' }}>
                <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>Connectez-vous</Link> pour participer à la discussion.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {comments.length === 0 && (
                <p style={{ color: 'var(--gray-400, #9ca3af)', fontSize: '13px' }}>Aucun commentaire pour l&apos;instant.</p>
              )}
              {comments.map((c) => {
                const replies = openReplies[c.id];
                const formOpen = replyFormOpen[c.id] ?? false;
                const draft = replyDrafts[c.id] ?? '';
                const cAuthorLabel = c.commentByName || c.commentByUser.slice(0, 8);
                return (
                  <div key={c.id}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--gray-200, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--gray-600, #4b5563)', flexShrink: 0 }}>
                        {initials(cAuthorLabel)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700, #374151)', marginBottom: '2px' }}>{cAuthorLabel}</div>
                        <div style={{ fontSize: '14px', color: 'var(--gray-800, #1f2937)', lineHeight: 1.5 }}>{c.content}</div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gray-400, #9ca3af)' }}>{formatDate(c.createdAt)}</span>
                          {sessionUser && (
                            <>
                              {replies !== undefined
                                ? <button type="button" onClick={() => hideReplies(c.id)} style={{ border: 'none', background: 'none', color: 'var(--gray-500, #6b7280)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Masquer les réponses</button>
                                : <button type="button" onClick={() => openReplyForm(c.id)} style={{ border: 'none', background: 'none', color: 'var(--gray-500, #6b7280)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Répondre</button>
                              }
                              {sessionUser.id === c.commentByUser && (
                                <button type="button" onClick={() => deleteComment(c.id)} style={{ border: 'none', background: 'none', color: 'var(--gray-400, #9ca3af)', fontSize: '11px', cursor: 'pointer', padding: 0 }}>
                                  Supprimer
                                </button>
                              )}
                            </>
                          )}
                        </div>

                        {replies !== undefined && (
                          <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--gray-100, #f3f4f6)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {replies.map((r) => (
                              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
                                <div>
                                  {r.replyByName && <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-600, #4b5563)', marginBottom: '1px' }}>{r.replyByName}</div>}
                                  <div style={{ fontSize: '13px', color: 'var(--gray-700, #374151)' }}>{r.content}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                  <button type="button" onClick={() => openReplyForm(c.id)} style={{ border: 'none', background: 'none', color: 'var(--gray-500, #6b7280)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Répondre</button>
                                  <button type="button" onClick={() => deleteReply(c.id, r.id)} style={{ border: 'none', background: 'none', color: 'var(--gray-400, #9ca3af)', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Supprimer</button>
                                </div>
                              </div>
                            ))}
                            {formOpen && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                  value={draft}
                                  onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  placeholder="Répondre à ce commentaire…"
                                  style={{ flex: 1, background: 'var(--gray-50, #f8fafc)', border: 'none', borderRadius: '999px', padding: '8px 14px', fontSize: '13px', outline: 'none' }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') submitReply(c.id); }}
                                />
                                <button type="button" onClick={() => submitReply(c.id)} disabled={!draft.trim()} style={{ border: 'none', borderRadius: '999px', padding: '0 14px', background: 'var(--gray-100, #f3f4f6)', color: 'var(--gray-700, #374151)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                  Envoyer
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal d'abonnement newsletter */}
      {showSubscribeModal && authorRedacteur && (
        <div
          onClick={() => setShowSubscribeModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--dark, #111827)' }}>
              S&apos;abonner à la newsletter de {authorRedacteur.prenom}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--gray-500, #6b7280)', margin: '0 0 16px' }}>Recevez ses prochaines publications par email.</p>
            <input
              type="email"
              value={modalEmail}
              onChange={(e) => setModalEmail(e.target.value)}
              placeholder="votre@email.com"
              style={{ width: '100%', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowSubscribeModal(false)} style={{ border: 'none', background: 'none', color: 'var(--gray-500, #6b7280)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>Annuler</button>
              <button
                type="button"
                onClick={handleSubscribeSubmit}
                disabled={subscribeBusy || !modalEmail.trim()}
                style={{ border: 'none', borderRadius: '8px', padding: '8px 18px', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: subscribeBusy ? 'default' : 'pointer', opacity: modalEmail.trim() ? 1 : 0.5 }}
              >
                S&apos;abonner
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width: 900px) {
          .detail-grid { grid-template-columns: 1fr!important; }
        }
      `}</style>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: '12px', padding: '4px 12px', borderRadius: '999px', background: 'var(--gray-100, #f3f4f6)', color: 'var(--gray-600, #4b5563)' }}>
      {children}
    </span>
  );
}
