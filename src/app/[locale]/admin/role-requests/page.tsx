'use client';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { apiFetch, BffApiError } from '@/lib/api-client';

// Codes de rôle RBAC education (cf. templates KSM). Deux rôles : Rédacteur / Lecteur.
const ROLE_EDITOR = 'EDUCATION_EDITOR_PERMISSIONS';
const ROLE_READER = 'EDUCATION_READER_PERMISSIONS';

type Application = {
  id: string;
  userId: string;
  applicantEmail: string | null;
  applicantName: string | null;
  domains: string[];
  proofUrl: string | null;
  motivation: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string | null;
};

type RoleRef = { assignmentId: string; roleId: string; code: string | null; name: string | null; scopeType: string | null };
type AdminUser = {
  userId: string; email: string; username: string; status: string; createdAt: string | null;
  firstName: string | null; lastName: string | null; roles: RoleRef[];
};
type AdminRole = { id: string; code: string; name: string };

type RoleKind = 'editor' | 'reader' | 'admin' | 'none';
type Tab = 'pending' | 'approved';

const ROLE_BADGE: Record<RoleKind, { label: string; bg: string; color: string }> = {
  editor: { label: 'Rédacteur', bg: '#F5F0FF', color: '#7C3AED' },
  reader: { label: 'Lecteur', bg: 'var(--gray-100)', color: 'var(--gray-600)' },
  admin: { label: 'Admin', bg: '#FEF2F2', color: '#DC2626' },
  none: { label: 'Aucun rôle', bg: 'var(--gray-100)', color: 'var(--gray-400)' },
};

function roleKind(u: AdminUser | undefined): RoleKind {
  if (!u) return 'none';
  const codes = u.roles.map((r) => r.code);
  if (codes.includes(ROLE_EDITOR)) return 'editor';
  if (codes.includes(ROLE_READER)) return 'reader';
  if (codes.some((c) => c === 'SUPER_EDUCATION_SERVICES_MANAGER' || c === 'EDUCATION_MANAGER')) return 'admin';
  return 'none';
}

function displayName(a: Application): string {
  return a.applicantName?.trim() || a.applicantEmail || a.userId;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

const th: CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const td: CSSProperties = { padding: '14px 16px', fontSize: 14, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-100)', verticalAlign: 'top' };
const chip: CSSProperties = { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: 'var(--gray-100)', color: 'var(--gray-700)', fontSize: 11, fontWeight: 600, marginRight: 6, marginBottom: 4 };

function badgeStyle(kind: RoleKind): CSSProperties {
  const b = ROLE_BADGE[kind];
  return { padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, whiteSpace: 'nowrap' };
}

function menuItemStyle(color: string): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent',
    color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  };
}

export default function RoleRequestsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const fetchData = useCallback(async () => {
    const [a, u, r] = await Promise.all([
      apiFetch<Application[]>('/api/admin/role-requests'),
      apiFetch<AdminUser[]>('/api/admin/users'),
      apiFetch<AdminRole[]>('/api/admin/roles'),
    ]);
    setItems(Array.isArray(a) ? a : []);
    setUsers(Array.isArray(u) ? u : []);
    setRoles(Array.isArray(r) ? r : []);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, u, r] = await Promise.all([
          apiFetch<Application[]>('/api/admin/role-requests'),
          apiFetch<AdminUser[]>('/api/admin/users'),
          apiFetch<AdminRole[]>('/api/admin/roles'),
        ]);
        if (!cancelled) {
          setItems(Array.isArray(a) ? a : []);
          setUsers(Array.isArray(u) ? u : []);
          setRoles(Array.isArray(r) ? r : []);
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

  const userMap = useMemo(() => {
    const m = new Map<string, AdminUser>();
    for (const u of users) m.set(u.userId, u);
    return m;
  }, [users]);

  const counts = useMemo(() => ({
    pending: items.filter((a) => a.status === 'PENDING').length,
    approved: items.filter((a) => a.status === 'APPROVED').length,
  }), [items]);

  const visible = useMemo(
    () => items.filter((a) => (tab === 'pending' ? a.status === 'PENDING' : a.status === 'APPROVED')),
    [items, tab],
  );

  const editorRole = roles.find((r) => r.code === ROLE_EDITOR);
  const readerRole = roles.find((r) => r.code === ROLE_READER);

  async function decide(id: string, action: 'approve' | 'reject') {
    setMenu(null);
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/role-requests/${id}/${action}`, { method: 'POST' });
      await fetchData();
      showToast(action === 'approve' ? 'Candidature validée' : 'Candidature refusée');
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Action impossible.');
    } finally {
      setBusyId(null);
    }
  }

  // Change directement le rôle du demandeur (réutilise les endpoints de la page Utilisateurs).
  async function setRole(app: Application, target: 'editor' | 'reader') {
    setMenu(null);
    const targetCode = target === 'editor' ? ROLE_EDITOR : ROLE_READER;
    const targetRole = target === 'editor' ? editorRole : readerRole;
    if (!targetRole) { showToast(`Rôle ${target === 'editor' ? 'Rédacteur' : 'Lecteur'} introuvable (non provisionné)`); return; }
    const u = userMap.get(app.userId);
    setBusyId(app.id);
    setError(null);
    try {
      const toRevoke = (u?.roles ?? []).filter((r) => (r.code === ROLE_EDITOR || r.code === ROLE_READER) && r.code !== targetCode);
      for (const r of toRevoke) {
        await apiFetch(`/api/admin/users/${app.userId}/roles/${r.assignmentId}`, { method: 'DELETE' });
      }
      if (!(u?.roles ?? []).some((r) => r.code === targetCode)) {
        await apiFetch(`/api/admin/users/${app.userId}/roles`, { method: 'POST', body: { roleId: targetRole.id } });
      }
      await fetchData();
      showToast(`${displayName(app)} : ${target === 'editor' ? 'Rédacteur' : 'Lecteur'}`);
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec du changement de rôle.');
    } finally {
      setBusyId(null);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Validées' },
  ];

  const menuApp = menu ? visible.find((a) => a.id === menu.id) ?? null : null;

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: 'var(--primary)', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', margin: 0 }}>Candidatures Rédacteur</h1>
        <p style={{ color: 'var(--gray-500)', margin: '4px 0 0', fontSize: 14 }}>
          Lecteurs souhaitant devenir Rédacteur.
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20,
            border: `1px solid ${tab === t.key ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: tab === t.key ? 'var(--blue)' : '#fff',
            color: tab === t.key ? '#fff' : 'var(--gray-600)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t.label} <span style={{ opacity: .7 }}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={th}>Candidat</th>
              <th style={th}>Rôle</th>
              <th style={th}>Domaines</th>
              <th style={th}>Preuve / Motivation</th>
              <th style={th}>Demandé le</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={td} colSpan={6}>Chargement…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td style={{ ...td, color: 'var(--gray-400)' }} colSpan={6}>
                {tab === 'pending' ? 'Aucune candidature en attente.' : 'Aucune candidature validée.'}
              </td></tr>
            ) : (
              visible.map((a) => {
                const kind = roleKind(userMap.get(a.userId));
                return (
                  <tr key={a.id} style={{ opacity: busyId === a.id ? .5 : 1 }}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {displayName(a)}
                      <div style={{ fontWeight: 400, color: 'var(--gray-500)', fontSize: 12 }}>{a.applicantEmail}</div>
                    </td>
                    <td style={td}><span style={badgeStyle(kind)}>{ROLE_BADGE[kind].label}</span></td>
                    <td style={td}>
                      {(a.domains ?? []).map((d) => <span key={d} style={chip}>{d}</span>)}
                    </td>
                    <td style={{ ...td, maxWidth: 320 }}>
                      {a.proofUrl && (
                        <a href={a.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1565C0', textDecoration: 'underline', fontSize: 13, wordBreak: 'break-all' }}>
                          {a.proofUrl}
                        </a>
                      )}
                      {a.motivation && (
                        <p style={{ margin: '6px 0 0', color: 'var(--gray-600)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{a.motivation}</p>
                      )}
                    </td>
                    <td style={td}>{formatDate(a.createdAt)}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" title="Actions" disabled={busyId === a.id} onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu((m) => (m?.id === a.id ? null : { id: a.id, x: Math.max(8, r.right - 210), y: r.bottom + 6 }));
                      }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: menu?.id === a.id ? 'var(--gray-200)' : 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {/* 3 points horizontaux */}
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Menu ⋯ — Valider / Rejeter / Changer de rôle */}
      {menu && menuApp && (
        <>
          <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: 210, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.16)', zIndex: 1001, padding: 4, fontSize: 13 }}>
            {menuApp.status === 'PENDING' && (
              <>
                <button type="button" onClick={() => decide(menuApp.id, 'approve')} style={menuItemStyle('#16A34A')}>Valider</button>
                <button type="button" onClick={() => decide(menuApp.id, 'reject')} style={menuItemStyle('#DC2626')}>Rejeter</button>
                <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />
              </>
            )}
            <div style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Changer de rôle</div>
            {(['editor', 'reader'] as const).map((target) => {
              const current = roleKind(userMap.get(menuApp.userId)) === target;
              const label = target === 'editor' ? 'Rédacteur' : 'Lecteur';
              return (
                <button key={target} type="button" disabled={current} onClick={() => setRole(menuApp, target)} style={{ ...menuItemStyle('var(--gray-800)'), justifyContent: 'space-between', opacity: current ? 0.55 : 1, cursor: current ? 'default' : 'pointer' }}>
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
