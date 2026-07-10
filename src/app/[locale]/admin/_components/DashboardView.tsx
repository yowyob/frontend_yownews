'use client';
// Tableau de bord partagé par l'espace admin (/admin) et éditeur (/editor).
// Données RÉELLES : l'admin agrège les vrais utilisateurs (/api/admin/users) et les vraies
// demandes de rôle (/api/admin/role-requests). L'éditeur n'a pas accès aux endpoints admin →
// vue d'accueil sobre, sans chiffres. (Plus aucune donnée mock.)
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';

const ROLE_EDITOR = 'EDUCATION_EDITOR_PERMISSIONS';
const ROLE_READER = 'EDUCATION_READER_PERMISSIONS';

type RoleRef = { code: string | null };
type AdminUser = { userId: string; roles: RoleRef[] };
type Application = {
  id: string; userId: string; applicantEmail: string | null; applicantName: string | null;
  domains: string[]; status: 'PENDING' | 'APPROVED' | 'REJECTED'; createdAt: string | null;
};

function isEditor(u: AdminUser) { return u.roles.some((r) => r.code === ROLE_EDITOR); }
function isReader(u: AdminUser) { return u.roles.some((r) => r.code === ROLE_READER); }

const card: CSSProperties = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, padding: 20, boxShadow: 'var(--sh-sm)' };

function WelcomeBanner({ firstName, subtitle }: { firstName: string; subtitle: string }) {
  return (
    <div style={{ background: 'var(--primary)', borderRadius: 16, padding: '28px 32px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -80, right: 160, width: 300, height: 300, background: 'rgba(255,255,255,.05)', borderRadius: '50%' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-d)', fontSize: 21, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Bonjour, {firstName} </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,.7)' }}>{subtitle}</div>
      </div>
    </div>
  );
}

// Couleur = sens : bleu landing pour un compteur neutre, orange pour ce qui attend une action.
const NEUTRAL_COLOR = 'var(--primary)';
const ATTENTION_COLOR = 'var(--accent)';

function StatCard({ label, value, color, href, sub }: { label: string; value: number | string; color: string; href: string; sub?: string }) {
  return (
    <Link
      href={href}
      style={{ ...card, cursor: 'pointer', display: 'block', textDecoration: 'none', transition: 'transform .2s ease, box-shadow .2s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-md)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-sm)'; }}
    >
      <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{sub}</div>}
      <div style={{ fontSize: 11, color, marginTop: 8, fontFamily: 'var(--font-d)', fontWeight: 600 }}>Voir</div>
    </Link>
  );
}

// Carte "Blogs" — deux compteurs (publiés / en attente) dans la même carte.
function BlogsStatCard({ published, pending, loading }: { published: number; pending: number; loading: boolean }) {
  return (
    <Link
      href="/admin/blogs"
      style={{ ...card, cursor: 'pointer', display: 'block', textDecoration: 'none', transition: 'transform .2s ease, box-shadow .2s ease' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-md)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = 'var(--sh-sm)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700, color: NEUTRAL_COLOR, lineHeight: 1 }}>{loading ? '…' : published}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>Publiés</div>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 700, color: ATTENTION_COLOR, lineHeight: 1 }}>{loading ? '…' : pending}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>En attente</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 8 }}>Blogs</div>
      <div style={{ fontSize: 11, color: NEUTRAL_COLOR, marginTop: 8, fontFamily: 'var(--font-d)', fontWeight: 600 }}>Voir</div>
    </Link>
  );
}

type BlogStub = { id: string };

function AdminDashboard({ firstName }: { firstName: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [blogCounts, setBlogCounts] = useState<{ published: number; pending: number }>({ published: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, a, published, submitted] = await Promise.all([
          apiFetch<AdminUser[]>('/api/admin/users'),
          apiFetch<Application[]>('/api/admin/role-requests'),
          apiFetch<BlogStub[]>('/api/admin/blogs?status=PUBLISHED'),
          apiFetch<BlogStub[]>('/api/admin/blogs?status=SUBMITTED'),
        ]);
        if (!cancelled) {
          setUsers(Array.isArray(u) ? u : []);
          setApps(Array.isArray(a) ? a : []);
          setBlogCounts({
            published: Array.isArray(published) ? published.length : 0,
            pending: Array.isArray(submitted) ? submitted.length : 0,
          });
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => ({
    total: users.length,
    editors: users.filter(isEditor).length,
    readers: users.filter((u) => isReader(u) && !isEditor(u)).length,
  }), [users]);
  const pending = useMemo(() => apps.filter((a) => a.status === 'PENDING'), [apps]);

  const subtitle = loading
    ? "Bienvenue dans l'espace administrateur"
    : `Bienvenue dans l'espace administrateur · ${pending.length} demande(s) de rôle en attente`;

  return (
    <div>
      <WelcomeBanner firstName={firstName} subtitle={subtitle} />

      {error && <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }} className="stats-row">
        <StatCard
          label="Utilisateurs"
          value={loading ? '…' : stats.total}
          color={NEUTRAL_COLOR}
          href="/admin/users"
          sub={loading ? undefined : `${pending.length} rédacteur(s) en attente de validation`}
        />
        <BlogsStatCard published={blogCounts.published} pending={blogCounts.pending} loading={loading} />
        <StatCard label="Lecteurs" value={loading ? '…' : stats.readers} color="var(--gray-600)" href="/admin/users" />
        <StatCard label="Demandes en attente" value={loading ? '…' : pending.length} color={ATTENTION_COLOR} href="/admin/role-requests" />
      </div>

      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 15, fontWeight: 700, color: 'var(--dark)', margin: 0 }}>Demandes de rôle en attente</h3>
          <Link href="/admin/role-requests" style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600 }}>Voir tout</Link>
        </div>
        {loading ? (
          <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>Chargement…</div>
        ) : pending.length === 0 ? (
          <div style={{ color: 'var(--gray-400)', fontSize: 14 }}>Aucune demande en attente.</div>
        ) : (
          pending.slice(0, 6).map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < Math.min(pending.length, 6) - 1 ? '1px solid var(--gray-100)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-d)', fontSize: 13, fontWeight: 600, color: 'var(--dark)' }}>{a.applicantName?.trim() || a.applicantEmail || a.userId}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{(a.domains ?? []).join(', ') || '—'}</div>
              </div>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-d)', background: '#FEF9EC', color: '#B45309' }}>En attente</span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @media(max-width:1200px){ .stats-row { grid-template-columns: repeat(2,1fr)!important; } }
        @media(max-width:768px){ .stats-row { grid-template-columns: 1fr 1fr!important; } }
      `}</style>
    </div>
  );
}

function EditorDashboard({ firstName }: { firstName: string }) {
  return (
    <div>
      <WelcomeBanner firstName={firstName} subtitle="Bienvenue dans l'espace rédacteur · créez vos articles, podcasts et cours" />
      <div style={{ ...card, maxWidth: 640 }}>
        <h3 style={{ fontFamily: 'var(--font-d)', fontSize: 15, fontWeight: 700, color: 'var(--dark)', margin: '0 0 8px' }}>Votre espace Rédacteur</h3>
        <p style={{ margin: '0 0 16px', color: 'var(--gray-600)', fontSize: 14 }}>
          Consultez votre profil et gérez vos contenus. La création de blogs, podcasts et cours arrive bientôt.
        </p>
        <Link href="/editor/profile" className="btn btn-orange btn-sm">Mon profil</Link>
      </div>
    </div>
  );
}

export default function DashboardView({ firstName, variant = 'admin' }: { firstName: string; variant?: 'admin' | 'editor' }) {
  return variant === 'editor' ? <EditorDashboard firstName={firstName} /> : <AdminDashboard firstName={firstName} />;
}
