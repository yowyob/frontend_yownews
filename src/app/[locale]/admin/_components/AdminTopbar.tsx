'use client';
import { useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import OrgSwitcher from './OrgSwitcher';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

type Variant = 'admin' | 'editor' | 'reader';

// Raccourcis inspirés des chips de la navbar Medium ("Get app" / "Write") : accès direct aux
// onglets de sidebar les plus utilisés, communs aux 3 espaces (reader/editor/admin) — chacun
// vers l'équivalent pertinent de son propre espace.
function quickLinks(variant: Variant, spacePrefix: string) {
  return [
    {
      label: 'Feed',
      href: `${spacePrefix}/feed/blogs`,
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15" height="15"><path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/><circle cx="5" cy="19" r="1"/></svg>,
    },
    {
      label: 'Favoris',
      href: `${spacePrefix}/favorites`,
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15" height="15"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"/></svg>,
    },
    {
      label: 'Forums',
      href: variant === 'admin' ? '/admin/forums' : variant === 'reader' ? '/reader/forums' : '/editor/forum',
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15" height="15"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    },
    {
      label: 'Blogs',
      href: variant === 'admin' ? '/admin/blogs' : variant === 'editor' ? '/editor/blog' : `${spacePrefix}/feed/blogs`,
      icon: <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="15" height="15"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1"/></svg>,
    },
  ];
}

const MOCK_ROLE_LABELS: Record<Variant, string> = { admin: 'Administrateur', editor: 'Rédacteur', reader: 'Lecteur' };

export default function AdminTopbar({ displayName, variant = 'admin', mockMode = false }: { displayName: string; variant?: Variant; mockMode?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);

  const spacePrefix = variant === 'reader' ? '/reader' : variant === 'admin' ? '/admin' : '/editor';
  const profileHref = `${spacePrefix}/profile`;

  async function switchMockRole(role: Variant) {
    if (role === variant || switchingRole) return;
    setSwitchingRole(true);
    setRoleMenuOpen(false);
    try {
      await fetch('/api/mock/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      router.push(role === 'admin' ? '/admin/dashboard' : role === 'editor' ? '/editor/dashboard' : '/reader/feed/blogs');
      router.refresh();
    } finally {
      setSwitchingRole(false);
    }
  }

  return (
    <header style={{
      height: '64px', background: '#fff', borderBottom: '1px solid var(--gray-200)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: '10px',
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, boxShadow: 'var(--sh-sm)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <div style={{ width: '30px', height: '30px', background: '#FF6B35', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>YE</div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 800, color: 'var(--primary)', whiteSpace: 'nowrap' }} className="tb-brand">
          YowYob <span style={{ color: 'var(--accent)' }}>Education</span>
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {/* Recherche — icône qui se déploie au clic (pas encore branchée : reste grisée/désactivée) */}
      {searchOpen ? (
        <div
          title="Bientôt disponible"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '20px', padding: '8px 14px', width: '220px', opacity: 0.7 }}
          className="tb-search-wrap"
        >
          <svg width="15" height="15" fill="none" stroke="var(--gray-400)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="search" disabled autoFocus
            placeholder="Recherche — bientôt disponible" aria-label="Recherche (bientôt disponible)"
            style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--gray-400)', outline: 'none', width: '100%', fontFamily: 'var(--font-b)', cursor: 'not-allowed' }}
          />
          <button
            type="button" onClick={() => setSearchOpen(false)} aria-label="Fermer la recherche"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)', display: 'flex', flexShrink: 0 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ) : (
        <button
          type="button" onClick={() => setSearchOpen(true)} aria-label="Ouvrir la recherche"
          style={{
            width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
            border: '1px solid var(--gray-200)', background: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-500)', transition: 'all .2s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-500)'; }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      )}

      {/* Raccourcis rapides — style Medium, entre la recherche et les notifications */}
      <nav aria-label="Raccourcis" className="tb-quicklinks" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {quickLinks(variant, spacePrefix).map(({ label, href, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={label}
              href={href}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
                borderRadius: '20px', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                whiteSpace: 'nowrap', transition: 'background .2s, color .2s',
                color: active ? '#fff' : 'var(--gray-600)',
                background: active ? 'var(--accent)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--gray-100)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {icon}
              <span className="tb-ql-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Organisation active — switch sans re-login (même token, X-Organization-Id change côté
          BFF). Badge statique si une seule org accessible, invisible si aucune (ex. lecteur
          freelance sans organisation). */}
      <OrgSwitcher />

      {/* Sélecteur de rôle démo — MOCK_MODE uniquement : bascule la session factice entre les
          3 personas (admin/rédacteur/lecteur) pour prévisualiser chaque sidebar/espace. */}
      {mockMode && (
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setRoleMenuOpen((o) => !o)}
            disabled={switchingRole}
            aria-haspopup="menu" aria-expanded={roleMenuOpen}
            title="Rôle simulé (mode démo)"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
              borderRadius: '20px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap',
              border: '1px solid var(--accent)', background: 'rgba(255,107,53,.08)', color: 'var(--accent)',
              cursor: switchingRole ? 'wait' : 'pointer', opacity: switchingRole ? 0.6 : 1,
            }}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            Démo : {MOCK_ROLE_LABELS[variant]}
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="12" height="12" style={{ transform: roleMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
          </button>

          {roleMenuOpen && (
            <>
              <div onClick={() => setRoleMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
              <div
                role="menu"
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '180px',
                  background: '#fff', borderRadius: '10px', border: '1px solid var(--gray-200)',
                  boxShadow: 'var(--sh-lg)', padding: '6px', zIndex: 150,
                }}
              >
                {(['admin', 'editor', 'reader'] as Variant[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    role="menuitem"
                    onClick={() => switchMockRole(role)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                      padding: '9px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 500,
                      color: role === variant ? 'var(--accent)' : 'var(--dark)',
                      background: role === variant ? 'rgba(255,107,53,.08)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { if (role !== variant) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; }}
                    onMouseLeave={(e) => { if (role !== variant) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {MOCK_ROLE_LABELS[role]}
                    {role === variant && (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Notifications — pas encore branchées : grisées, sans faux badge de compteur */}
      <button
        aria-label="Notifications (bientôt disponible)" disabled title="Bientôt disponible"
        style={{
          width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
          border: '1px solid var(--gray-200)', background: '#fff', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', color: 'var(--gray-400)', opacity: 0.6,
        }}
      >
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
      </button>

      {/* User avatar + menu (Mon Profil / Paramètres) */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          aria-haspopup="menu" aria-expanded={profileOpen}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background .2s', border: 'none', background: profileOpen ? 'var(--gray-50)' : 'transparent' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--gray-50)')}
          onMouseLeave={(e) => { if (!profileOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
            {initials(displayName)}
          </div>
          <span style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }} className="tb-name">
            {displayName.split(' ')[0]}
          </span>
          <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" height="14" style={{ color: 'var(--gray-400)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {profileOpen && (
          <>
            <div onClick={() => setProfileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 149 }} />
            <div
              role="menu"
              style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: '190px',
                background: '#fff', borderRadius: '10px', border: '1px solid var(--gray-200)',
                boxShadow: 'var(--sh-lg)', padding: '6px', zIndex: 150,
              }}
            >
              <Link
                href={profileHref} role="menuitem" onClick={() => setProfileOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, color: 'var(--dark)', textDecoration: 'none' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--gray-50)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16" height="16" style={{ color: 'var(--gray-400)' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                Mon Profil
              </Link>
              <div
                title="Bientôt disponible"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '7px', fontSize: '13px', fontWeight: 500, color: 'var(--gray-400)', cursor: 'not-allowed' }}
              >
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                Paramètres
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media(max-width:1200px){ .tb-ql-label{display:none!important} }
        @media(max-width:768px){
          .tb-name,.tb-quicklinks{display:none!important}
          /* Laisse la place au bouton hamburger (fixe, en haut à gauche) de la sidebar mobile */
          header{padding-left:60px!important}
        }
        @media(max-width:420px){ .tb-brand{display:none!important} }
      `}</style>
    </header>
  );
}
