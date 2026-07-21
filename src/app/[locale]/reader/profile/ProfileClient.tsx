'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import BlogPreviewModal, { type BlogPreviewData } from '@/components/education/BlogPreviewModal';

type Application = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  domains: string[];
  createdAt: string | null;
};

type Blog = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
};

type FollowCounts = { followers: number; following: number };

// `view` : 'editor' = profil Rédacteur (onglet Posts) — utilisé par Rédacteur ET Admin ;
//          'reader' = profil Lecteur avec la bannière « Devenir Rédacteur ».
// `blogHref` : espace de rédaction à lier depuis le dropdown Post (/editor/blog ou /admin/blogs).
// `orgMode` : en mode organisation, on ne propose jamais « Devenir Rédacteur » (l'utilisateur est
// owner/employé d'une org, pas un lecteur candidat) — on affiche directement la vue posts.
type Props = { displayName: string; email: string; view: 'editor' | 'reader'; roleLabel: string; blogHref?: string; orgMode?: boolean };

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  PUBLISHED: { label: 'Publié', bg: 'rgba(34,197,94,.1)', color: '#16A34A' },
  SUBMITTED: { label: 'En attente de validation', bg: '#FEF9EC', color: '#B45309' },
  DRAFT: { label: 'Brouillon', bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  REFUSED: { label: 'Rejeté', bg: '#FEF2F2', color: '#DC2626' },
};

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Petit menu déroulant générique (Post▾ / Follow▾), fermeture au clic extérieur.
function Dropdown({ label, active, disabled, children }: { label: string; active?: boolean; disabled?: boolean; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const base: CSSProperties = {
    padding: '10px 2px', fontSize: 14, fontWeight: 700, background: 'none', border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    color: disabled ? 'var(--gray-400)' : active ? 'var(--primary)' : 'var(--gray-500)',
    cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4,
  };

  if (disabled) {
    return <span title="Bientôt disponible" style={base}>{label}</span>;
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={base}>
        {label}
        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 190, overflow: 'hidden', padding: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function ProfileClient({ displayName, email, view, roleLabel, blogHref = '/editor/blog', orgMode = false }: Props) {
  // En mode org, on force la vue « éditeur » (posts) : pas de bannière « Devenir Rédacteur ».
  const isEditor = view === 'editor' || orgMode;
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(view === 'reader');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs du formulaire « Devenir Rédacteur »
  const [domains, setDomains] = useState<string[]>([]);
  const [proofUrl, setProofUrl] = useState('');
  const [motivation, setMotivation] = useState('');
  // Domaines proposés — mêmes données live que ContentEditor (/api/education/domains), pas la
  // constante EDUCATION_DOMAINS statique/obsolète (elle ne couvrait plus tous les domaines réels,
  // ex. CUISINE) : un candidat rédacteur doit choisir parmi ce qu'il pourra réellement publier.
  const [domainOptions, setDomainOptions] = useState<string[]>([]);

  // Posts + compteurs follow (branche Rédacteur/Admin)
  const [posts, setPosts] = useState<Blog[] | null>(null);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [counts, setCounts] = useState<FollowCounts | null>(null);
  const [preview, setPreview] = useState<BlogPreviewData | null>(null);

  useEffect(() => {
    if (isEditor) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<Application | null>('/api/role-requests/me');
        if (!cancelled) setApplication(data);
      } catch {
        if (!cancelled) setApplication(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    apiFetch<string[]>('/api/education/domains')
      .then((data) => { if (!cancelled) setDomainOptions(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setDomainOptions([]); });
    return () => { cancelled = true; };
  }, [isEditor]);

  useEffect(() => {
    if (!isEditor) return;
    let cancelled = false;
    (async () => {
      try {
        const [blogs, fc] = await Promise.all([
          apiFetch<Blog[]>('/api/education/blogs'),
          apiFetch<FollowCounts>('/api/profile/follow-counts'),
        ]);
        if (!cancelled) {
          setPosts(Array.isArray(blogs) ? blogs.filter((b) => b.status !== 'ARCHIVED') : []);
          setCounts(fc);
        }
      } catch (e) {
        if (!cancelled) setPostsError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [isEditor]);

  async function openPreview(id: string) {
    try {
      const detail = await apiFetch<BlogPreviewData>(`/api/education/blogs/${id}`);
      setPreview(detail);
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : "Erreur de chargement de l'aperçu");
    }
  }

  function toggleDomain(d: string) {
    setDomains((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function submit() {
    setError(null);
    if (!domains.length) { setError('Sélectionnez au moins un domaine.'); return; }
    if (!proofUrl.trim()) { setError('Le lien de preuve est requis.'); return; }
    if (!motivation.trim()) { setError('La motivation est requise.'); return; }
    setSubmitting(true);
    try {
      const created = await apiFetch<Application>('/api/role-requests', {
        method: 'POST',
        body: { domains, proofUrl: proofUrl.trim(), motivation: motivation.trim() },
      });
      setApplication(created);
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  }

  const card: React.CSSProperties = {
    background: '#fff', border: '1px solid var(--gray-100)', borderRadius: 14, padding: 24,
    boxShadow: '0 1px 3px rgba(0,0,0,.04)',
  };
  const input: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-300)',
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box',
  };
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* En-tête profil */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: 22, flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{displayName}</h1>
            <div style={{ color: 'var(--gray-500)', fontSize: 14 }}>{email}</div>
            <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: isEditor ? 'rgba(255,107,53,.12)' : 'var(--gray-100)', color: isEditor ? 'var(--accent)' : 'var(--gray-600)' }}>
              {roleLabel}
            </span>
          </div>
        </div>

        {isEditor && (
          <>
            <p style={{ margin: '14px 0 0', fontSize: 13, color: 'var(--gray-400)', fontStyle: 'italic' }}>Aucune bio renseignée.</p>
            {/* Mentions sociales (Abonnés / Abonnements / Posts) masquées en mode organisation :
                un compte d'organisation n'est pas un profil social de rédacteur individuel. */}
            {!orgMode && (
            <div style={{ display: 'flex', gap: 24, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--gray-100)' }}>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{counts?.followers ?? 0}</b> Abonnés</span>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{counts?.following ?? 0}</b> Abonnements</span>
              <span style={{ fontSize: 13, color: 'var(--gray-600)' }}><b style={{ color: 'var(--primary)' }}>{posts?.length ?? 0}</b> Posts</span>
            </div>
            )}
          </>
        )}
      </div>

      {isEditor ? (
        <div style={card}>
          {/* Dropdown Follow masqué en mode organisation (pas de fonction sociale). */}
          {!orgMode && (
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--gray-200)', marginBottom: 16 }}>
            <Dropdown label="Follow" active>
              <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--gray-700)' }}>Abonnés <b>{counts?.followers ?? 0}</b></div>
              <div style={{ padding: '8px 10px', fontSize: 13, color: 'var(--gray-700)' }}>Abonnements <b>{counts?.following ?? 0}</b></div>
            </Dropdown>
            <Dropdown label="Edit Profile" disabled />
          </div>
          )}

          {postsError && <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FEF2F2', color: '#B91C1C', fontSize: 13, marginBottom: 12 }}>{postsError}</div>}
          {!posts && !postsError && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>Chargement…</div>}
          {posts && posts.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-500)', fontSize: 14 }}>Aucun post pour le moment.</div>
          )}

          {posts && posts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((p) => {
                const badge = STATUS_BADGE[p.status ?? ''] ?? STATUS_BADGE.DRAFT;
                const date = p.status === 'PUBLISHED' ? p.publishedAt : p.updatedAt ?? p.createdAt;
                return (
                  <article key={p.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, background: badge.bg, color: badge.color }}>{badge.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{formatDate(date)}</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{p.title}</h3>
                        {p.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--gray-600)' }}>{p.description}</p>}
                      </div>
                      <button type="button" onClick={() => openPreview(p.id)} style={{ flexShrink: 0, border: '1px solid var(--gray-200)', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--gray-700)' }}>
                        Aperçu
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Link href={blogHref} className="btn btn-orange btn-sm">Gérer mes blogs</Link>
          </div>
        </div>
      ) : (
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', margin: '0 0 6px' }}>Devenir Rédacteur</h2>

          {loading ? (
            <span style={{ color: 'var(--gray-400)', fontSize: 14 }}>Chargement…</span>
          ) : application?.status === 'PENDING' ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', margin: '0 0 12px' }}>
                Votre candidature est en cours d’examen par un administrateur.
              </p>
              <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 13, fontWeight: 600 }}>
                Candidature en attente{application.domains?.length ? ` · ${application.domains.join(', ')}` : ''}
              </span>
            </>
          ) : application?.status === 'APPROVED' ? (
            <>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', margin: '0 0 12px' }}>
                Votre candidature est approuvée 🎉 — <strong>reconnectez-vous</strong> pour activer votre
                espace Rédacteur (création de blogs, podcasts, cours…).
              </p>
              <button
                type="button"
                onClick={async () => {
                  try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
                  window.location.href = '/auth/login';
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 8, padding: '10px 18px', background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Se reconnecter
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', margin: '0 0 16px' }}>
                {application?.status === 'REJECTED'
                  ? 'Votre dernière candidature a été refusée. Vous pouvez en soumettre une nouvelle.'
                  : 'Précisez vos domaines, un lien prouvant vos compétences et votre motivation.'}
              </p>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Domaines</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {domainOptions.map((d) => {
                  const on = domains.includes(d);
                  return (
                    <button key={d} type="button" onClick={() => toggleDomain(d)}
                      style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: on ? '1px solid var(--accent)' : '1px solid var(--gray-300)',
                        background: on ? 'var(--accent)' : '#fff', color: on ? '#fff' : 'var(--gray-700)' }}>
                      {d}
                    </button>
                  );
                })}
              </div>

              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Lien de preuve (portfolio, LinkedIn, site…)</label>
              <input style={{ ...input, marginBottom: 16 }} type="url" placeholder="https://…" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} />

              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Motivation</label>
              <textarea style={{ ...input, minHeight: 96, resize: 'vertical', marginBottom: 16 }} placeholder="Décrivez votre expérience et ce que vous souhaitez rédiger." value={motivation} onChange={(e) => setMotivation(e.target.value)} />

              <button type="button" className="btn btn-orange btn-sm" disabled={submitting} onClick={submit}>
                {submitting ? 'Envoi…' : 'Envoyer ma candidature'}
              </button>
            </>
          )}

          {error && <p style={{ color: '#B91C1C', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>
      )}

      {preview && <BlogPreviewModal blog={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
