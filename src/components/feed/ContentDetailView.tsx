'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import { coverPathFor } from './contentLinks';
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

  const supportsRatings = contentType === 'BLOG' || contentType === 'PODCAST';
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
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '14px 16px', borderRadius: '10px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' }}>
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

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '16px', overflow: 'hidden' }}>
        {!coverFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPathFor(contentType, id)}
            alt=""
            onError={() => setCoverFailed(true)}
            style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', display: 'block' }}
          />
        )}
        <div style={{ padding: '28px 32px' }}>
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {allTags.map((t) => (
                <span key={t} style={{ fontSize: '12px', color: 'var(--blue, #2563eb)', background: 'rgba(37,99,235,.07)', padding: '2px 8px', borderRadius: '20px' }}>#{t}</span>
              ))}
            </div>
          )}
          <span style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '.5px', textTransform: 'uppercase',
            color: 'var(--accent)', background: 'rgba(239,68,68,.08)', padding: '3px 9px', borderRadius: '20px',
          }}>
            {TYPE_LABELS[contentType]}
          </span>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '28px', fontWeight: 800, margin: '12px 0 16px' }}>{item.title}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <Link
              href={sessionUser ? `/profile/${item.authorId}` : '/auth/login'}
              onClick={(e) => { if (!sessionUser) { e.preventDefault(); router.push('/auth/login'); } }}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'inherit', textDecoration: 'none' }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
                {initials(authorLabel)}
              </div>
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 700 }}>
                <Link
                  href={sessionUser ? `/profile/${item.authorId}` : '/auth/login'}
                  onClick={(e) => { if (!sessionUser) { e.preventDefault(); router.push('/auth/login'); } }}
                  style={{ color: 'inherit', textDecoration: 'none' }}
                  className="hover:underline"
                >
                  {authorLabel}
                </Link>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500, #6b7280)' }}>
                {formatDate(item.publishedAt ?? item.createdAt)}
                {item.readingTime ? ` · ${item.readingTime} min de lecture` : ''}
              </div>
            </div>
            {followCounts && sessionUser && sessionUser.id !== item.authorId && (
              <button
                type="button"
                onClick={handleFollowToggle}
                disabled={followBusy}
                style={{
                  border: '1px solid var(--blue, #2563eb)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 700,
                  background: followCounts.isFollowing ? 'var(--blue, #2563eb)' : '#fff', color: followCounts.isFollowing ? '#fff' : 'var(--blue, #2563eb)',
                  cursor: 'pointer', flexShrink: 0, marginRight: '8px'
                }}
              >
                {followCounts.isFollowing ? 'Suivi' : 'Suivre'}
              </button>
            )}
            {sessionUser && authorRedacteur && (
              <button
                type="button"
                onClick={subscribeToRedacteur}
                disabled={subscribeBusy || subscribed}
                style={{
                  border: '1px solid var(--accent)', borderRadius: '20px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700,
                  background: subscribed ? 'var(--accent)' : '#fff', color: subscribed ? '#fff' : 'var(--accent)',
                  cursor: subscribed ? 'default' : 'pointer', flexShrink: 0,
                }}
              >
                {subscribed ? 'Abonné' : 'S’abonner à ma newsletter'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--gray-200, #e5e7eb)' }}>
            <button
              type="button"
              onClick={toggleFavorite}
              title={favorited ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: favorited ? 'var(--accent)' : 'var(--gray-400, #9ca3af)', fontSize: '13px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/>
              </svg>
              {favorited ? 'Favori' : 'Ajouter aux favoris'}
            </button>
          </div>

          {/* Course Enrollment & Progress */}
          {contentType === 'COURSE' && courseProgress && (
            <>
              {!courseProgress.enrolled ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(239,68,68,0.05))',
                  border: '1px solid var(--gray-200, #e5e7eb)',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>
                  <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Prêt à commencer ce cours ?</h3>
                  <p style={{ color: 'var(--gray-600)', fontSize: '14px', marginBottom: '16px' }}>Inscrivez-vous pour suivre votre progression et valider les chapitres.</p>
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={courseBusy}
                    style={{
                      border: 'none', borderRadius: '24px', padding: '10px 24px', fontSize: '14px', fontWeight: 700,
                      background: 'var(--blue, #2563eb)', color: '#fff', cursor: 'pointer'
                    }}
                  >
                    S&apos;inscrire au cours
                  </button>
                </div>
              ) : (
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid var(--gray-200, #e5e7eb)',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-700)' }}>Votre Progression</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--blue)' }}>{courseProgress.percent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                    <div style={{ width: `${courseProgress.percent}%`, height: '100%', background: 'var(--blue, #2563eb)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                  </div>

                  <h4 style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-700)' }}>Chapitres du cours :</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {courseUnits.map((unit) => {
                      const isCompleted = courseProgress.completedUnitIds.includes(unit.id);
                      return (
                        <div key={unit.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => handleCompleteUnit(unit.id)}
                            disabled={courseBusy}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13.5px', fontWeight: 600, color: isCompleted ? 'var(--gray-500)' : 'var(--gray-800)', textDecoration: isCompleted ? 'line-through' : 'none' }}>
                              {unit.title}
                            </div>
                            {unit.duration && (
                              <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{unit.duration} min</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {courseUnits.length === 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--gray-400)' }}>Aucun chapitre disponible pour le moment.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {item.description && (
            <p style={{ color: 'var(--gray-600, #4b5563)', fontSize: '15px', marginBottom: '16px' }}>{item.description}</p>
          )}
          {contentType === 'PODCAST' && (
            <audio
              controls
              src={`/api/education/podcasts/${id}/audio`}
              style={{ width: '100%', marginBottom: '20px', borderRadius: '8px' }}
            />
          )}
          <div className="content-detail-body" style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--gray-800, #1f2937)' }}
            dangerouslySetInnerHTML={{ __html: body ? body.replace(/\n/g, '<br/>') : '<p><em>Aucun contenu.</em></p>' }} />

          {supportsRatings && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--gray-200, #e5e7eb)' }}>
                <button
                  type="button"
                  onClick={() => sendReaction(true)}
                  disabled={ratingBusy || !ratingStats}
                  title="J'aime"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: ratingBusy ? 'default' : 'pointer', padding: '4px', color: ratingStats?.hasLiked ? 'var(--accent)' : 'var(--gray-500, #6b7280)', fontSize: '14px', fontWeight: 600 }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill={ratingStats?.hasLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                  J&apos;aime
                </button>
                <button
                  type="button"
                  onClick={() => sendReaction(false)}
                  disabled={ratingBusy || !ratingStats}
                  title="Je n'aime pas"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: 'none', cursor: ratingBusy ? 'default' : 'pointer', padding: '4px', color: ratingStats?.hasDisliked ? 'var(--blue, #2563eb)' : 'var(--gray-500, #6b7280)', fontSize: '14px', fontWeight: 600 }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill={ratingStats?.hasDisliked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ transform: 'scaleY(-1)' }}><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                  Je n&apos;aime pas
                </button>
              </div>

              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }}>
                  Commentaires {comments.length > 0 ? `(${comments.length})` : ''}
                </h3>
                {sessionUser ? (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ajouter un commentaire…"
                      style={{ flex: 1, border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '9px 12px', fontSize: '14px' }}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
                    />
                    <button
                      type="button"
                      onClick={submitComment}
                      disabled={commentBusy || !newComment.trim()}
                      style={{ border: 'none', borderRadius: '8px', padding: '0 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: commentBusy ? 'default' : 'pointer', opacity: newComment.trim() ? 1 : 0.6 }}
                    >
                      Publier
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '12px 14px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', color: '#6B7280', marginBottom: '18px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span>Veuillez vous </span>
                    <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'underline' }}>connecter</Link>
                    <span> pour participer à la discussion.</span>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {comments.length === 0 && (
                    <p style={{ color: 'var(--gray-400, #9ca3af)', fontSize: '13px' }}>Aucun commentaire pour l&apos;instant.</p>
                  )}
                  {comments.map((c) => {
                    const replies = openReplies[c.id];
                    const formOpen = replyFormOpen[c.id] ?? false;
                    const draft = replyDrafts[c.id] ?? '';
                    const authorLabel = c.commentByName || c.commentByUser.slice(0, 8);
                    return (
                      <div key={c.id} style={{ paddingBottom: '12px', borderBottom: '1px solid var(--gray-100, #f3f4f6)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--gray-200, #e5e7eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--gray-600, #4b5563)', flexShrink: 0 }}>
                            {initials(authorLabel)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-700, #374151)', marginBottom: '2px' }}>{authorLabel}</div>
                            <div style={{ fontSize: '13.5px', color: 'var(--gray-800, #1f2937)' }}>{c.content}</div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
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
                              <div style={{ marginTop: '10px', paddingLeft: '14px', borderLeft: '2px solid var(--gray-100, #f3f4f6)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                      style={{ flex: 1, border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '6px', padding: '6px 10px', fontSize: '13px' }}
                                      onKeyDown={(e) => { if (e.key === 'Enter') submitReply(c.id); }}
                                    />
                                    <button type="button" onClick={() => submitReply(c.id)} disabled={!draft.trim()} style={{ border: 'none', borderRadius: '6px', padding: '0 12px', background: 'var(--gray-100, #f3f4f6)', color: 'var(--gray-700, #374151)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
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
            </>
          )}
        </div>
      </div>
      <style>{`
        .content-detail-body h2 { font-size: 20px; font-weight: 700; margin: 16px 0 8px; }
        .content-detail-body h3 { font-size: 17px; font-weight: 700; margin: 12px 0 6px; }
        .content-detail-body ul, .content-detail-body ol { padding-left: 22px; }
        .content-detail-body blockquote { border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280; }
        .content-detail-body a { color: #2563eb; text-decoration: underline; }
      `}</style>
    </div>
  );
}
