'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { useSessionUser } from '@/components/providers/session-provider';
import { Link } from '@/i18n/navigation';
import UserAvatar from '@/components/ui/UserAvatar';

type PublicContentInfo = {
  id: string;
  title: string;
  description?: string | null;
  contentType: string;
  domain: string;
  publishedAt: string;
};

type UserPublicProfile = {
  id: string;
  firstName: string;
  lastName: string;
  biography?: string | null;
  photoId?: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  contents: PublicContentInfo[];
};

type ApprovedRedacteur = { id: string; email: string; nom: string; prenom: string } | null;
type AuthorNewsletter = { id: string; titre: string };

const TYPE_LABELS: Record<string, string> = {
  BLOG: 'Article',
  PODCAST: 'Podcast',
  COURSE: 'Cours',
};

const CONTENT_PATH: Record<string, string> = {
  BLOG: 'feed/blogs',
  PODCAST: 'feed/podcasts',
  COURSE: 'feed/cours',
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const sessionUser = useSessionUser();

  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'publications' | 'newsletter'>('publications');
  const [authorRedacteur, setAuthorRedacteur] = useState<ApprovedRedacteur>(null);
  const [authorNewsletters, setAuthorNewsletters] = useState<AuthorNewsletter[]>([]);
  const [redacteurFollowed, setRedacteurFollowed] = useState(false);
  const [redacteurFollowBusy, setRedacteurFollowBusy] = useState(false);
  const [subscribedNewsletterIds, setSubscribedNewsletterIds] = useState<Set<string>>(new Set());
  const [newsletterBusyId, setNewsletterBusyId] = useState<string | null>(null);

  // Le profilé est-il un rédacteur newsletter, et lesquelles de ses newsletters sont approuvées ?
  // Distinct du suivi générique de l'auteur (bouton "Suivre" ci-dessus, /api/follows) — ceci
  // concerne spécifiquement l'abonnement newsletter (mécanismes #2 et #3, voir onglet Newsletter).
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const redacteur = await apiFetch<ApprovedRedacteur>(`/api/newsletter/redacteurs/by-user/${profile.id}`);
        if (cancelled) return;
        setAuthorRedacteur(redacteur);
        if (redacteur) {
          apiFetch<{ id: string }[]>('/api/newsletter/subscriptions/redacteurs')
            .then((mine) => { if (!cancelled && Array.isArray(mine)) setRedacteurFollowed(mine.some((r) => r.id === redacteur.id)); })
            .catch(() => {});
        }
      } catch { /* pas un rédacteur */ }
      try {
        const info = await apiFetch<{ hasNewsletter: boolean; newsletters: AuthorNewsletter[] }>(`/api/newsletter/newsletters/by-author/${profile.id}`);
        if (!cancelled) setAuthorNewsletters(info?.newsletters ?? []);
      } catch { /* pas de newsletter */ }
      try {
        const ids = await apiFetch<string[]>('/api/newsletter/subscriptions/newsletters');
        if (!cancelled && Array.isArray(ids)) setSubscribedNewsletterIds(new Set(ids));
      } catch { /* best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  async function toggleFollowRedacteur() {
    if (!authorRedacteur || redacteurFollowBusy) return;
    setRedacteurFollowBusy(true);
    try {
      if (redacteurFollowed) {
        await apiFetch(`/api/newsletter/subscriptions/redacteurs/${authorRedacteur.id}`, { method: 'DELETE' });
        setRedacteurFollowed(false);
      } else {
        await apiFetch(`/api/newsletter/subscriptions/redacteurs/${authorRedacteur.id}`, {
          method: 'POST',
          body: { email: sessionUser?.email ?? '' },
        });
        setRedacteurFollowed(true);
      }
    } catch (e) { console.error(e); }
    finally { setRedacteurFollowBusy(false); }
  }

  async function toggleSubscribeNewsletter(newsletterId: string) {
    if (newsletterBusyId) return;
    setNewsletterBusyId(newsletterId);
    const alreadySubscribed = subscribedNewsletterIds.has(newsletterId);
    try {
      if (alreadySubscribed) {
        await apiFetch(`/api/newsletter/newsletters/${newsletterId}/subscribe`, { method: 'DELETE' });
        setSubscribedNewsletterIds((prev) => { const next = new Set(prev); next.delete(newsletterId); return next; });
      } else {
        await apiFetch(`/api/newsletter/newsletters/${newsletterId}/subscribe`, {
          method: 'POST',
          body: { email: sessionUser?.email ?? '' },
        });
        setSubscribedNewsletterIds((prev) => new Set(prev).add(newsletterId));
      }
    } catch (e) { console.error(e); }
    finally { setNewsletterBusyId(null); }
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<UserPublicProfile>(`/api/users/${userId}/profile`);
        if (!cancelled) setProfile(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof BffApiError ? e.message : 'Impossible de charger le profil.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  async function handleFollowToggle() {
    if (!profile || followBusy) return;
    setFollowBusy(true);
    try {
      if (profile.isFollowing) {
        await apiFetch(`/api/follows/${profile.id}`, { method: 'DELETE' });
        setProfile((prev) =>
          prev
            ? { ...prev, followersCount: Math.max(0, prev.followersCount - 1), isFollowing: false }
            : null
        );
      } else {
        await apiFetch(`/api/follows/${profile.id}`, { method: 'POST' });
        setProfile((prev) =>
          prev
            ? { ...prev, followersCount: prev.followersCount + 1, isFollowing: true }
            : null
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-500)' }}>Chargement du profil…</div>;
  }

  if (error || !profile) {
    return (
      <div style={{ maxWidth: '640px', margin: '40px auto', padding: '14px 16px', borderRadius: '10px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px' }}>
        {error || 'Profil introuvable.'}
      </div>
    );
  }

  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Utilisateur';

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      {/* En-tête profil public */}
      <div style={{ background: '#fff', border: '1px solid var(--gray-100, #f3f4f6)', borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <UserAvatar name={name} photoId={profile.photoId} size={72} fontSize={26} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{name}</h1>
              {sessionUser && sessionUser.id !== profile.id && (
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  disabled={followBusy}
                  style={{
                    border: `1px solid ${profile.isFollowing ? 'var(--accent)' : 'var(--primary)'}`, borderRadius: '20px', padding: '5px 16px', fontSize: '12px', fontWeight: 700,
                    background: profile.isFollowing ? 'var(--accent)' : '#fff', color: profile.isFollowing ? '#fff' : 'var(--primary)',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  {profile.isFollowing ? 'Suivi' : 'Suivre'}
                </button>
              )}
            </div>
            <div style={{ color: 'var(--gray-500)', fontSize: '14px', marginTop: '4px' }}>Membre de Yowyob Education</div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{profile.followersCount}</b> abonnés</span>
              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{profile.followingCount}</b> abonnements</span>
              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{profile.contents.length}</b> publications</span>
            </div>
          </div>
        </div>

        {profile.biography ? (
          <p style={{ margin: '20px 0 0', fontSize: '14.5px', color: 'var(--gray-700)', lineHeight: 1.6 }}>{profile.biography}</p>
        ) : (
          <p style={{ margin: '20px 0 0', fontSize: '13.5px', color: 'var(--gray-400)', fontStyle: 'italic' }}>Aucune biographie disponible.</p>
        )}
      </div>

      {/* Onglets : Publications / Newsletter (visible seulement si l'auteur a ≥1 newsletter approuvée) */}
      {authorNewsletters.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {([['publications', 'Publications'], ['newsletter', 'Newsletter']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
              padding: '8px 16px', borderRadius: 20,
              border: `1px solid ${activeTab === key ? 'var(--accent)' : 'var(--gray-200)'}`,
              background: activeTab === key ? 'var(--accent)' : '#fff',
              color: activeTab === key ? '#fff' : 'var(--gray-600)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
      )}

      {activeTab === 'newsletter' && authorNewsletters.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '14px', padding: '24px', marginBottom: '20px' }}>
          {authorRedacteur && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 16px', borderRadius: '10px', background: 'var(--gray-50, #f9fafb)', marginBottom: '18px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>Suivre {profile.firstName || 'cet auteur'}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray-500, #6b7280)', marginTop: '2px' }}>Recevez toutes ses newsletters, actuelles et futures.</div>
              </div>
              <button type="button" onClick={toggleFollowRedacteur} disabled={redacteurFollowBusy} style={{
                border: 'none', borderRadius: '20px', padding: '8px 18px', fontSize: '13px', fontWeight: 700,
                background: redacteurFollowed ? 'var(--gray-200, #e5e7eb)' : 'var(--accent)',
                color: redacteurFollowed ? 'var(--gray-700, #374151)' : '#fff',
                cursor: redacteurFollowBusy ? 'default' : 'pointer', opacity: redacteurFollowBusy ? 0.7 : 1, whiteSpace: 'nowrap',
              }}>{redacteurFollowed ? 'Suivi' : 'Suivre'}</button>
            </div>
          )}

          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px' }}>Ou s&apos;abonner à une newsletter précise</h3>
          <p style={{ fontSize: '12px', color: 'var(--gray-500, #6b7280)', margin: '0 0 14px' }}>
            Ne couvre que cette newsletter — les futures newsletters de {profile.firstName || 'cet auteur'} ne seront pas incluses.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {authorNewsletters.map((n) => {
              const subscribed = subscribedNewsletterIds.has(n.id);
              const busy = newsletterBusyId === n.id;
              return (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px', padding: '12px 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{n.titre}</div>
                  <button type="button" onClick={() => toggleSubscribeNewsletter(n.id)} disabled={busy} style={{
                    border: `1px solid ${subscribed ? 'var(--gray-200, #e5e7eb)' : 'var(--accent)'}`, borderRadius: '8px', padding: '6px 14px',
                    background: subscribed ? '#fff' : 'var(--accent)', color: subscribed ? 'var(--gray-700, #374151)' : '#fff',
                    fontSize: '12.5px', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, whiteSpace: 'nowrap',
                  }}>{subscribed ? 'Abonné' : 'S’abonner'}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Publications de l'auteur */}
      <div style={{ display: activeTab === 'publications' || authorNewsletters.length === 0 ? 'block' : 'none', background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '14px', padding: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 700, margin: '0 0 16px', color: 'var(--primary)' }}>
          Publications de {profile.firstName || 'cet auteur'}
        </h2>

        {profile.contents.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
            Aucun contenu publié pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {profile.contents.map((item) => {
              const type = item.contentType.toUpperCase();
              const label = TYPE_LABELS[type] || type;
              const linkPath = `/${CONTENT_PATH[type]}/${item.id}`;

              return (
                <article key={item.id} style={{ border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', transition: 'border-color 0.2s', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.3px', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(239,68,68,.08)', padding: '2px 8px', borderRadius: '20px' }}>
                        {label}
                      </span>
                      {item.domain && (
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>• {item.domain}</span>
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>{formatDate(item.publishedAt)}</span>
                  </div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700 }}>
                    <Link href={linkPath} style={{ color: 'var(--primary)', textDecoration: 'none' }} className="hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  {item.description && (
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
