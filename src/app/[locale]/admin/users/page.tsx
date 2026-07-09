'use client';
import { useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import { apiFetch } from '@/lib/api-client';

// Codes de rôle RBAC education (cf. templates KSM). Deux rôles seulement : Rédacteur / Lecteur.
const ROLE_EDITOR = 'EDUCATION_EDITOR_PERMISSIONS';
const ROLE_READER = 'EDUCATION_READER_PERMISSIONS';

type RoleRef = { assignmentId: string; roleId: string; code: string | null; name: string | null; scopeType: string | null };
type AdminUser = {
  userId: string; email: string; username: string; status: string; createdAt: string | null;
  firstName: string | null; lastName: string | null; roles: RoleRef[];
};
type AdminRole = { id: string; code: string; name: string };

type RoleKind = 'editor' | 'reader' | 'admin' | 'none';
type RoleFilter = 'all' | 'editor' | 'reader';

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'editor', label: 'Rédacteurs' },
  { key: 'reader', label: 'Lecteurs' },
];

const ROLE_BADGE: Record<RoleKind, { label: string; bg: string; color: string }> = {
  editor: { label: 'Rédacteur', bg: '#F5F0FF', color: '#7C3AED' },
  reader: { label: 'Lecteur', bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  admin: { label: 'Admin', bg: '#FEF2F2', color: '#DC2626' },
  none: { label: 'Aucun rôle', bg: 'var(--gray-100)', color: 'var(--gray-400)' },
};

const PAGE_SIZE = 10;
const AVATAR_COLORS = ['#1565C0', '#7C3AED', '#0891B2', '#16A34A', '#EA580C', '#DC2626', '#DB2777', '#9333EA'];

function roleKind(u: AdminUser): RoleKind {
  const codes = u.roles.map((r) => r.code);
  if (codes.includes(ROLE_EDITOR)) return 'editor';
  if (codes.includes(ROLE_READER)) return 'reader';
  if (codes.some((c) => c === 'SUPER_EDUCATION_SERVICES_MANAGER' || c === 'EDUCATION_MANAGER')) return 'admin';
  return 'none';
}
function displayName(u: AdminUser): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return full || u.email;
}
function initials(u: AdminUser): string {
  if (u.firstName || u.lastName) return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
  return u.email.slice(0, 2).toUpperCase();
}
function avatarColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Note: pas de setState synchrone (loading démarre déjà à true) → compatible react-hooks/set-state-in-effect.
  const fetchData = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([
        apiFetch<AdminUser[]>('/api/admin/users'),
        apiFetch<AdminRole[]>('/api/admin/roles'),
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => { setLoading(true); await fetchData(); }, [fetchData]);

  // Chargement initial : async inline + garde `cancelled` (idiome du repo, cf. TaxonomyManager).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [u, r] = await Promise.all([
          apiFetch<AdminUser[]>('/api/admin/users'),
          apiFetch<AdminRole[]>('/api/admin/roles'),
        ]);
        if (!cancelled) { setUsers(Array.isArray(u) ? u : []); setRoles(Array.isArray(r) ? r : []); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const editorRole = roles.find((r) => r.code === ROLE_EDITOR);
  const readerRole = roles.find((r) => r.code === ROLE_READER);

  async function setRole(user: AdminUser, target: 'editor' | 'reader') {
    const targetCode = target === 'editor' ? ROLE_EDITOR : ROLE_READER;
    const targetRole = target === 'editor' ? editorRole : readerRole;
    setMenu(null);
    if (!targetRole) { showToast(`Rôle ${target === 'editor' ? 'Rédacteur' : 'Lecteur'} introuvable (non provisionné)`); return; }
    setBusyId(user.userId);
    try {
      // Révoquer l'autre rôle education s'il est présent.
      const toRevoke = user.roles.filter((r) => (r.code === ROLE_EDITOR || r.code === ROLE_READER) && r.code !== targetCode);
      for (const a of toRevoke) {
        await apiFetch(`/api/admin/users/${user.userId}/roles/${a.assignmentId}`, { method: 'DELETE' });
      }
      // Assigner le rôle cible s'il ne l'a pas déjà.
      if (!user.roles.some((r) => r.code === targetCode)) {
        await apiFetch(`/api/admin/users/${user.userId}/roles`, { method: 'POST', body: { roleId: targetRole.id } });
      }
      showToast(`${displayName(user)} : ${target === 'editor' ? 'Rédacteur' : 'Lecteur'}`);
      await fetchData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Échec du changement de rôle');
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter !== 'all') list = list.filter((u) => roleKind(u) === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => `${displayName(u)} ${u.email}`.toLowerCase().includes(q));
    }
    return list;
  }, [users, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const menuUser = menu ? users.find((u) => u.userId === menu.id) ?? null : null;

  const counts = useMemo(() => ({
    all: users.length,
    editor: users.filter((u) => roleKind(u) === 'editor').length,
    reader: users.filter((u) => roleKind(u) === 'reader').length,
  }), [users]);

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '24px', zIndex: 9999, background: 'var(--primary)', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-d)', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 700, color: 'var(--dark)' }}>Utilisateurs</div>
          <div style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '2px' }}>
            {loading ? 'Chargement…' : `${users.length} membre(s) · ${counts.editor} rédacteur(s) · ${counts.reader} lecteur(s)`}
          </div>
        </div>
        <button onClick={() => refresh()} disabled={loading} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)', fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}>
          ↻ Rafraîchir
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '14px', boxShadow: 'var(--sh-sm)', overflow: 'hidden' }}>
        {/* Toolbar : filtre par rôle + recherche */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', flexWrap: 'wrap' }}>
          {ROLE_FILTERS.map((rf) => (
            <button key={rf.key} onClick={() => { setRoleFilter(rf.key); setPage(1); }} style={{
              padding: '6px 12px', borderRadius: '20px',
              border: `1px solid ${roleFilter === rf.key ? 'var(--blue)' : 'var(--gray-200)'}`,
              background: roleFilter === rf.key ? 'var(--blue)' : '#fff',
              color: roleFilter === rf.key ? '#fff' : 'var(--gray-600)',
              fontFamily: 'var(--font-d)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>
              {rf.label} <span style={{ opacity: .7 }}>{counts[rf.key]}</span>
            </button>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', flex: 1, minWidth: '200px', maxWidth: '320px', marginLeft: 'auto' }}>
            <svg width="14" height="14" fill="none" stroke="var(--gray-400)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher…" style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--dark)', outline: 'none', width: '100%', fontFamily: 'var(--font-b)' }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Utilisateur', 'Rôle', 'Statut', 'Inscription', 'Actions'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: i === 4 ? 'center' : 'left', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>Chargement…</td></tr>
              ) : error ? (
                <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#DC2626', fontSize: '13px' }}>{error}</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>Aucun utilisateur</td></tr>
              ) : paginated.map((u, idx) => {
                const kind = roleKind(u);
                const badge = ROLE_BADGE[kind];
                return (
                  <tr key={u.userId} style={{ borderTop: '1px solid var(--gray-100)', background: idx % 2 === 1 ? 'var(--gray-50)' : '#fff', opacity: busyId === u.userId ? .5 : 1 }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: avatarColor(u.userId), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '12px', color: '#fff', flexShrink: 0 }}>{initials(u)}</div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>{displayName(u)}</div>
                          <div style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-d)', background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-d)', background: u.status === 'ACTIVE' ? '#F0FDF4' : 'var(--gray-100)', color: u.status === 'ACTIVE' ? '#16A34A' : 'var(--gray-500)' }}>{u.status === 'ACTIVE' ? 'Actif' : u.status}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button title="Actions" disabled={busyId === u.userId} onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu((m) => (m?.id === u.userId ? null : { id: u.userId, x: Math.max(8, r.right - 200), y: r.bottom + 6 }));
                      }} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: menu?.id === u.userId ? 'var(--gray-200)' : 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--gray-100)', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--gray-400)', fontFamily: 'var(--font-d)' }}>
              {`Affichage ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length}`}
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--gray-200)', background: '#fff', color: page === 1 ? 'var(--gray-300)' : 'var(--dark)', cursor: page === 1 ? 'default' : 'pointer' }}>‹</button>
              <span style={{ minWidth: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontFamily: 'var(--font-d)', color: 'var(--gray-600)' }}>{page}/{totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid var(--gray-200)', background: '#fff', color: page === totalPages ? 'var(--gray-300)' : 'var(--dark)', cursor: page === totalPages ? 'default' : 'pointer' }}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Menu kebab ⋮ — changer le rôle */}
      {menu && menuUser && (
        <>
          <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: '200px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,.16)', zIndex: 1001, padding: '4px', fontFamily: 'var(--font-d)', fontSize: '13px' }}>
            <div style={{ padding: '4px 10px', fontSize: '10px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Changer le rôle</div>
            {(['editor', 'reader'] as const).map((target) => {
              const current = roleKind(menuUser) === target;
              const label = target === 'editor' ? 'Rédacteur' : 'Lecteur';
              return (
                <button key={target} disabled={current} onClick={() => setRole(menuUser, target)} style={{ ...menuItemStyle('var(--dark)'), justifyContent: 'space-between', opacity: current ? 0.55 : 1, cursor: current ? 'default' : 'pointer' }}>
                  <span>Passer {label}</span>
                  {current && <svg width="13" height="13" fill="none" stroke="var(--blue)" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function menuItemStyle(color: string): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '8px 10px', borderRadius: '7px', border: 'none', background: 'transparent',
    color, fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  };
}
