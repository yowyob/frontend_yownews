'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { apiFetch } from '@/lib/api-client';

// Bleu de la landing page (--b600 dans landingStyles.ts), en aplat — jamais en dégradé.
const LANDING_BLUE = '#1F5FBF';
// Variante plus sombre (--b700 de la même famille) réservée à la grande surface de la sidebar :
// moins de clarté = moins de fatigue visuelle sur un aplat aussi large, tout en restant "le bleu landing".
const SIDEBAR_BLUE = '#1A4F9E';

// Un seul traitement (fond orange plein, texte blanc) pour les 3 rôles : les variantes
// translucides précédentes manquaient de contraste sur le fond bleu foncé de la sidebar.
const ROLE_BADGE_STYLE: Record<'admin' | 'editor' | 'reader', { bg: string; fg: string }> = {
  admin: { bg: '#FF6B35', fg: '#fff' },
  editor: { bg: '#FF6B35', fg: '#fff' },
  reader: { bg: '#FF6B35', fg: '#fff' },
};

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: number; enabled?: boolean; adminOnly?: boolean };

const NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Général',
    items: [
      { href: '/admin/dashboard', label: 'Tableau de bord', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
      { href: '/admin/notifications', label: 'Notifications', icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> },
      { href: '/admin/favorites', label: 'Favoris', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg> },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { href: '/admin/users', label: 'Utilisateurs', enabled: true, adminOnly: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
      { href: '/admin/role-requests', label: 'Demandes', enabled: true, adminOnly: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6"/></svg> },
      { href: '/editor/organisation', label: 'Organisation', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857"/></svg> },
    ],
  },
  {
    label: 'Communauté',
    items: [],
  },
];

const READER_NAV: { label: string; items: NavItem[] }[] = [
  {
    label: 'Général',
    items: [
      { href: '/reader/notifications', label: 'Notifications', icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg> },
      { href: '/reader/favorites', label: 'Favoris', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg> },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { href: '/reader/forums', label: 'Forums', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
      { href: '/reader/newsletter', label: 'Newsletter', enabled: true, icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg> },
    ],
  },
];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function EvaluateAppModal({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (score < 1 || submitting) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/ratings/evaluate', { method: 'POST', body: { score, feedback: feedback.trim() || undefined } });
      setDone(true);
      setTimeout(onClose, 1200);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '380px', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        {done ? (
          <p style={{ fontSize: '14px', color: '#059669', fontWeight: 600, margin: 0, textAlign: 'center' }}>Merci pour votre évaluation !</p>
        ) : (
          <>
            <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: '#111827' }}>Évaluer l&apos;application</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>Votre avis nous aide à améliorer la plateforme.</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setScore(n)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill={n <= score ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1.5">
                    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/>
                  </svg>
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Un commentaire (facultatif)…"
              style={{ width: '100%', minHeight: '70px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>Annuler</button>
              <button type="button" onClick={submit} disabled={score < 1 || submitting} style={{ border: 'none', borderRadius: '8px', padding: '8px 18px', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: score < 1 ? 'default' : 'pointer', opacity: score < 1 ? 0.5 : 1 }}>
                Envoyer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SIDEBAR_COLLAPSE_KEY = 'yn:sidebar-collapsed';

export default function AdminSidebar({ displayName, variant = 'admin', roleBadge }: { displayName: string; email: string; variant?: 'admin' | 'editor' | 'reader'; roleBadge: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [educationOpen, setEducationOpen] = useState(true);
  const [feedOpen, setFeedOpen] = useState(true);
  const [newsletterOpen, setNewsletterOpen] = useState(
    () => pathname.startsWith('/admin/newsletters') || pathname === '/editor/newsletter'
  );
  const [forumOpen, setForumOpen] = useState(
    () => pathname.startsWith('/admin/forums') || pathname === '/editor/forum'
  );
  const [collapsed, setCollapsed] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Ferme le drawer mobile à chaque changement de page (évite qu'il reste ouvert par-dessus le contenu).
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === '1') setCollapsed(true);
    } catch { /* navigation privée / quota */ }
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--sb-w', collapsed ? '72px' : '260px');
    try { window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* idem */ }
  }, [collapsed]);

  // Le variant ne pilote que la navigation ; le badge de rôle vient de la session (prop roleBadge).
  const isAdmin = variant === 'admin';
  const isReader = variant === 'reader';

  const spacePrefix = isReader ? '/reader' : isAdmin ? '/admin' : '/editor';
  const profileHref = `${spacePrefix}/profile`;

  const [userCount, setUserCount] = useState<number | null>(null);
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const u = await apiFetch<unknown[]>('/api/admin/users');
        if (!cancelled) setUserCount(Array.isArray(u) ? u.length : null);
      } catch { /* badge masqué si indisponible */ }
    })();
    return () => { cancelled = true; };
  }, [isAdmin]);

  const navGroups = isReader
    ? READER_NAV
    : NAV
        .map((group) => ({ ...group, items: group.items.filter((item) => isAdmin || !item.adminOnly) }))
        .filter((group) => group.items.length > 0 || group.label === 'Gestion' || group.label === 'Communauté');

  // Les groupes (Général, Gestion, …) sont eux-mêmes des accordéons — un seul ouvert à la fois,
  // pour réduire la charge visuelle. On ouvre par défaut celui qui contient la page active.
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    if (pathname.startsWith('/admin/newsletters') || pathname === '/editor/newsletter') return 'Gestion';
    if (pathname.startsWith('/admin/forums') || pathname === '/editor/forum') return 'Communauté';
    if (
      pathname.startsWith('/admin/blogs') || pathname.startsWith('/editor/blog') ||
      pathname.startsWith('/admin/courses') || pathname.startsWith('/editor/course') ||
      pathname.startsWith('/admin/podcasts') || pathname.startsWith('/editor/podcast') ||
      pathname.startsWith('/admin/categories') || pathname.startsWith('/admin/tags')
    ) return 'Gestion';
    for (const group of navGroups) {
      for (const item of group.items) {
        const href =
          item.label === 'Tableau de bord' ? `${spacePrefix}/dashboard`
          : item.label === 'Favoris' ? `${spacePrefix}/favorites`
          : item.label === 'Forums' ? (isAdmin ? '/admin/forums' : isReader ? '/reader/forums' : '/editor/forum')
          : item.href;
        if (pathname === href || pathname.startsWith(href + '/')) return group.label;
      }
    }
    return 'Général';
  });
  function toggleGroup(label: string) {
    setOpenGroup((cur) => (cur === label ? null : label));
  }

  const activeLabel = (() => {
    if (pathname.startsWith('/admin/newsletters') || pathname === '/editor/newsletter') return 'Newsletter';
    if (pathname.startsWith('/admin/forums') || pathname === '/editor/forum') return 'Forums';
    if (pathname.startsWith('/admin/blogs') || pathname.startsWith('/editor/blog')) return 'Blog';
    if (pathname.startsWith('/admin/courses') || pathname.startsWith('/editor/course')) return 'Cours';
    if (pathname.startsWith('/admin/podcasts') || pathname.startsWith('/editor/podcast')) return 'Podcast';
    // Sous-liens du dropdown « Feed » (pas des items de navGroups, donc jamais matchés par la
    // boucle ci-dessous) — sans ce cas, le titre retombait sur « Tableau de bord ».
    if (pathname.includes('/feed/blogs')) return 'Blogs';
    if (pathname.includes('/feed/podcasts')) return 'Podcasts';
    if (pathname.includes('/feed/cours')) return 'Cours';
    // Mon Profil / Paramètres n'apparaissent plus dans la sidebar (déplacés dans le menu du
    // profil de la navbar) mais le titre doit quand même refléter la page active.
    if (pathname === profileHref || pathname.startsWith(profileHref + '/')) return 'Mon Profil';
    if (pathname.endsWith('/settings')) return 'Paramètres';
    for (const group of navGroups) {
      for (const item of group.items) {
        const href =
          item.label === 'Tableau de bord' ? `${spacePrefix}/dashboard`
          : item.label === 'Favoris' ? `${spacePrefix}/favorites`
          : item.label === 'Forums' ? (isAdmin ? '/admin/forums' : isReader ? '/reader/forums' : '/editor/forum')
          : item.href;
        if (pathname === href || pathname.startsWith(href + '/')) return item.label;
      }
    }
    return 'Tableau de bord';
  })();

  async function handleLogout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/auth/login');
  }

  // Bouton d'en-tête d'un groupe dépliable (Feed / Education / Newsletter / Forums) —
  // factorisé pour éviter de dupliquer 4 fois le même bloc de style (source de dérive visuelle).
  function renderDropdownToggle(label: string, icon: ReactNode, open: boolean, onToggle: () => void) {
    return (
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: 'calc(100% - 20px)',
        margin: '1px 10px', padding: '10px 20px', borderRadius: '8px', border: 'none',
        background: 'transparent', color: 'rgba(255,255,255,.88)', fontSize: '14.5px',
        cursor: 'pointer', textAlign: 'left', transition: 'all .2s', whiteSpace: 'nowrap',
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.88)'; }}
      >
        <span style={{ flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1 }} className="sb-text">{label}</span>
        <svg className="sb-text" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><path d="M9 18l6-6-6-6" /></svg>
      </button>
    );
  }

  // exact=true : le lien n'est actif que si le chemin correspond exactement
  // (evite que /admin/blogs soit marque actif quand on est sur /admin/blogs/moderation)
  function renderSubLink(href: string, label: string, exact = false) {
    const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'));
    return (
      <Link key={href} href={href} style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        margin: '1px 10px', padding: '8px 12px 8px 30px', borderRadius: '8px',
        fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
        color: active ? '#fff' : 'rgba(255,255,255,.88)',
        background: active ? 'rgba(255,255,255,.12)' : 'transparent',
        borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
        transition: 'all .2s',
      }}
        onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
        onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.88)'; } }}
      >
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', flexShrink: 0, opacity: 0.6 }} />
        {label}
      </Link>
    );
  }

  function renderSectionLabel(label: string) {
    return (
      <div style={{
        padding: '6px 12px 2px 30px', fontSize: '11px', fontWeight: 700,
        letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,.55)',
      }} className="sb-text">
        {label}
      </div>
    );
  }

  return (
    <>
      {/* Déclencheur mobile — la sidebar devient un drawer sous 768px (cf. CSS en bas) */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="sb-mobile-toggle"
        style={{
          position: 'fixed', top: '14px', left: '14px', zIndex: 210,
          width: '38px', height: '38px', borderRadius: '9px', border: 'none',
          background: 'var(--primary)', color: '#fff', display: 'none',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        }}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>

      {/* Overlay du drawer mobile */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 199 }}
        />
      )}

      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sb-w, 260px)',
        background: SIDEBAR_BLUE, display: 'flex', flexDirection: 'column',
        zIndex: 200, overflowY: 'auto', transition: 'width .3s ease, transform .3s ease',
      }} className={`${collapsed ? 'sb sb-collapsed' : 'sb'}${mobileOpen ? ' sb-mobile-open' : ''}`}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: '10px', flexShrink: 0 }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <Link href="/" style={{ width: '34px', height: '34px', background: '#FF6B35', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0, textDecoration: 'none' }}>YE</Link>
              <span style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeLabel}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Déplier le menu' : 'Replier le menu'}
            style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '7px', border: 'none',
              background: 'rgba(255,255,255,.08)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 300,
            }}
          >
            {collapsed
              ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
              : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            }
          </button>
        </div>

        {/* Profile */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.25)', background: LANDING_BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '14px', color: '#fff', flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }} className="sb-text">
            <div style={{ fontFamily: 'var(--font-d)', fontSize: '14.5px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <span style={{
              display: 'inline-block', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 600,
              padding: '2px 10px', borderRadius: '20px', marginTop: '3px',
              background: ROLE_BADGE_STYLE[variant].bg, color: ROLE_BADGE_STYLE[variant].fg,
            }}>{roleBadge}</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {navGroups.map((group) => {
            const groupExpanded = collapsed || openGroup === group.label;
            return (
            <div key={group.label} style={{ marginBottom: '4px' }}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="sb-text"
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                  padding: '10px 20px 8px', border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: '11px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                  color: 'rgba(255,255,255,.9)', textAlign: 'left',
                }}
              >
                <span style={{ flex: 1 }}>{group.label}</span>
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.7, transform: groupExpanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}><path d="M9 18l6-6-6-6" /></svg>
              </button>
              {groupExpanded && (
              <>
              {group.items.map((item) => {
                const href =
                  item.label === 'Tableau de bord' ? `${spacePrefix}/dashboard`
                  : item.label === 'Favoris' ? `${spacePrefix}/favorites`
                  : item.label === 'Forums' ? (isAdmin ? '/admin/forums' : '/reader/forums')
                  : item.href;
                const badgeValue = item.label === 'Utilisateurs' ? userCount : item.badge ?? null;
                const active = pathname === href || pathname.startsWith(href + '/');
                const baseStyle: React.CSSProperties = {
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: active ? '10px 20px 10px 17px' : '10px 20px',
                  margin: '1px 10px', borderRadius: '8px', fontSize: '14.5px',
                  transition: 'all .2s', whiteSpace: 'nowrap', textDecoration: 'none',
                };
                const badge = badgeValue != null ? (
                  <span style={{ minWidth: '18px', height: '18px', borderRadius: '9px', background: 'var(--accent)', color: '#fff', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-d)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }} className="sb-text">{badgeValue}</span>
                ) : null;

                if (!item.enabled) {
                  return (
                    <div key={item.href} title="Bientôt disponible" style={{
                      ...baseStyle, color: 'rgba(255,255,255,.35)', cursor: 'not-allowed',
                      borderLeft: '3px solid transparent',
                    }}>
                      <span style={{ flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} className="sb-text">{item.label}</span>
                      {badge}
                    </div>
                  );
                }

                return (
                  <Link key={href} href={href} style={{
                    ...baseStyle,
                    color: active ? '#fff' : 'rgba(255,255,255,.88)',
                    background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                    borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
                    onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.88)'; } }}
                  >
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} className="sb-text">{item.label}</span>
                    {badge}
                  </Link>
                );
              })}

              {/* Dropdown Feed */}
              {group.label === 'Général' && (
                <>
                  {renderDropdownToggle(
                    'Feed',
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>,
                    feedOpen,
                    () => setFeedOpen((o) => !o),
                  )}

                  {feedOpen && (
                    <div className="sb-text" style={{ marginBottom: '4px' }}>
                      {renderSubLink(`${spacePrefix}/feed/blogs`, 'Blogs')}
                      {renderSubLink(`${spacePrefix}/feed/podcasts`, 'Podcasts')}
                      {renderSubLink(`${spacePrefix}/feed/cours`, 'Cours')}
                    </div>
                  )}
                </>
              )}

              {/* Dropdown Education + Newsletter (après Gestion) */}
              {group.label === 'Gestion' && !isReader && (
                <>
                  {/* Education */}
                  {renderDropdownToggle(
                    'Education',
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M12 2L2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
                    educationOpen,
                    () => setEducationOpen((o) => !o),
                  )}

                  {educationOpen && (
                    <div className="sb-text" style={{ marginBottom: '4px' }}>
                      {isAdmin ? (
                        <>
                          {renderSectionLabel('Blog')}
                          {renderSubLink('/admin/blogs', 'Mes blogs', true)}
                          {renderSubLink('/admin/blogs/moderation', 'Gestion des blogs')}

                          {renderSectionLabel('Cours')}
                          {renderSubLink('/admin/courses', 'Mes cours', true)}
                          {renderSubLink('/admin/courses/moderation', 'Gestion des cours')}

                          {renderSectionLabel('Podcast')}
                          {renderSubLink('/admin/podcasts', 'Mes podcasts', true)}
                          {renderSubLink('/admin/podcasts/moderation', 'Gestion des podcasts')}

                          {renderSectionLabel('Taxonomie')}
                          {renderSubLink('/admin/categories', 'Catégories')}
                          {renderSubLink('/admin/tags', 'Tags')}
                        </>
                      ) : (
                        <>
                          {renderSubLink('/editor/blog', 'Blogs')}
                          {renderSubLink('/editor/course', 'Cours')}
                          {renderSubLink('/editor/podcast', 'Podcasts')}
                        </>
                      )}
                    </div>
                  )}

                  {/* Newsletter : dropdown (admin) ou lien direct (éditeur) */}
                  {isAdmin ? (
                    <>
                      {renderDropdownToggle(
                        'Newsletter',
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>,
                        newsletterOpen,
                        () => setNewsletterOpen((o) => !o),
                      )}
                      {newsletterOpen && (
                        <div className="sb-text" style={{ marginBottom: '4px' }}>
                          {renderSubLink('/admin/newsletters', 'Mes newsletters', true)}
                          {renderSubLink('/admin/newsletters/moderation', 'Gestion des newsletters')}
                          {renderSubLink('/admin/newsletters/categories', 'Catégories')}
                          {renderSubLink('/admin/newsletters/redacteurs', 'Rédacteurs')}
                        </div>
                      )}
                    </>
                  ) : (
                    (() => {
                      const active = pathname === '/editor/newsletter' || pathname.startsWith('/editor/newsletter/');
                      return (
                        <Link href="/editor/newsletter" style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: active ? '10px 20px 10px 17px' : '10px 20px',
                          margin: '1px 10px', borderRadius: '8px', fontSize: '14.5px',
                          transition: 'all .2s', whiteSpace: 'nowrap', textDecoration: 'none',
                          color: active ? '#fff' : 'rgba(255,255,255,.88)',
                          background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                          borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                          cursor: 'pointer',
                        }}
                          onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
                          onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.88)'; } }}
                        >
                          <span style={{ flexShrink: 0 }}>
                            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg>
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} className="sb-text">Newsletter</span>
                        </Link>
                      );
                    })()
                  )}
                </>
              )}

              {/* Forums : dropdown (admin) ou lien direct (éditeur) — Communauté section */}
              {group.label === 'Communauté' && !isReader && (
                <>
                  {isAdmin ? (
                    <>
                      {renderDropdownToggle(
                        'Forums',
                        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
                        forumOpen,
                        () => setForumOpen((o) => !o),
                      )}
                      {forumOpen && (
                        <div className="sb-text" style={{ marginBottom: '4px' }}>
                          {renderSubLink('/admin/forums', 'Mes forums', true)}
                          {renderSubLink('/admin/forums/moderation', 'Gestion des forums')}
                        </div>
                      )}
                    </>
                  ) : (
                    (() => {
                      const active = pathname === '/editor/forum' || pathname.startsWith('/editor/forum/');
                      return (
                        <Link href="/editor/forum" style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: active ? '10px 20px 10px 17px' : '10px 20px',
                          margin: '1px 10px', borderRadius: '8px', fontSize: '14.5px',
                          transition: 'all .2s', whiteSpace: 'nowrap', textDecoration: 'none',
                          color: active ? '#fff' : 'rgba(255,255,255,.88)',
                          background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                          borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                          cursor: 'pointer',
                        }}
                          onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; } }}
                          onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.88)'; } }}
                        >
                          <span style={{ flexShrink: 0 }}>
                            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="17" height="17"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} className="sb-text">Forums</span>
                        </Link>
                      );
                    })()
                  )}
                </>
              )}
              </>
              )}
            </div>
            );
          })}
        </nav>

        {/* Évaluer */}
        <div style={{ padding: '8px 10px 0', flexShrink: 0 }}>
          <button onClick={() => setEvalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px',
            fontSize: '14.5px', color: 'rgba(255,255,255,.82)', background: 'none', border: 'none', width: '100%',
            transition: 'all .2s', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.82)'; }}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z"/>
            </svg>
            <span className="sb-text">Évaluer l&apos;application</span>
          </button>
        </div>

        {evalOpen && <EvaluateAppModal onClose={() => setEvalOpen(false)} />}

        {/* Logout */}
        <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,.08)', flexShrink: 0 }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px',
            fontSize: '14.5px', color: 'rgba(255,255,255,.55)', background: 'none', border: 'none', width: '100%',
            transition: 'all .2s', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.1)'; (e.currentTarget as HTMLElement).style.color = '#FCA5A5'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.55)'; }}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16" height="16" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span className="sb-text">Se déconnecter</span>
          </button>
        </div>
      </aside>

      <style>{`
        .sb { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.1) transparent; }
        .sb-collapsed .sb-text { display: none!important; }
        @media(max-width:1024px){
          .sb { width: 64px!important; }
          .sb-text { display: none!important; }
        }
        @media(max-width:768px){
          /* La sidebar devient un drawer plein qui glisse depuis la gauche, plutôt que de
             disparaître sans alternative — sinon impossible de naviguer sur mobile. */
          .sb { width: 260px!important; transform: translateX(-100%); }
          .sb.sb-mobile-open { transform: translateX(0); }
          .sb.sb-mobile-open .sb-text { display: block!important; }
          .sb-mobile-toggle { display: flex!important; }
        }
      `}</style>
    </>
  );
}
