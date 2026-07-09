'use client';
import { Fragment, useEffect, useState, type CSSProperties } from 'react';
import { apiFetch, BffApiError } from '@/lib/api-client';
import BlogPreviewModal, { type BlogPreviewData } from '@/components/education/BlogPreviewModal';
import StatusBadge from '@/components/education/StatusBadge';

export type ContentModerationKind = 'blogs' | 'courses' | 'podcasts';

type ContentItem = {
  id: string;
  title: string;
  authorId?: string | null;
  domain?: string | null;
  status?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  transcript?: string | null;
};

type UnitItem = {
  id: string;
  title: string;
  status?: string | null;
  unit?: number | null;
};

type AdminUser = { userId: string; firstName: string | null; lastName: string | null; email: string };

type Tab = 'SUBMITTED' | 'PUBLISHED';

const KIND_NOUN: Record<ContentModerationKind, { singular: string; plural: string }> = {
  blogs: { singular: 'blog', plural: 'blogs' },
  courses: { singular: 'cours', plural: 'cours' },
  podcasts: { singular: 'podcast', plural: 'podcasts' },
};

const th: CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' };
const td: CSSProperties = { padding: '14px 16px', fontSize: 14, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-100)', verticalAlign: 'top' };

function menuItemStyle(color: string): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent',
    color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
  };
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}


const TABS: { key: Tab; label: string }[] = [
  { key: 'SUBMITTED', label: 'En attente de validation' },
  { key: 'PUBLISHED', label: 'Validés' },
];

export default function ContentModeration({ kind }: { kind: ContentModerationKind }) {
  const noun = KIND_NOUN[kind];
  const [tab, setTab] = useState<Tab>('SUBMITTED');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [preview, setPreview] = useState<BlogPreviewData | null>(null);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());

  // Cours uniquement : unités dépliées par cours (clé = courseId).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [unitsByCourse, setUnitsByCourse] = useState<Record<string, UnitItem[] | 'loading'>>({});
  const [unitMenu, setUnitMenu] = useState<{ courseId: string; unitId: string; x: number; y: number } | null>(null);
  const [busyUnitId, setBusyUnitId] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Résolution auteur — un seul appel admin-only, pour tous les types de contenu.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const users = await apiFetch<AdminUser[]>('/api/admin/users');
        if (cancelled) return;
        const map = new Map<string, string>();
        for (const u of Array.isArray(users) ? users : []) {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          map.set(u.userId, name || u.email);
        }
        setAuthorNames(map);
      } catch {
        /* la colonne Auteur retombe sur l'id tronqué si indisponible */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ContentItem[]>(`/api/admin/${kind}?status=${tab}`);
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, tab]);

  // Mise à jour optimiste : on patche le statut localement (badge instantané), puis on
  // laisse le filtre d'onglet faire disparaître l'item au prochain rendu plutôt que de
  // ré-attendre un refetch complet (évite le clignotement visible).
  function patchLocalStatus(id: string, status: string) {
    setItems((cur) => cur.map((it) => (it.id === id ? { ...it, status } : it)));
  }

  const openPreview = async (id: string) => {
    setMenu(null);
    setBusyId(id);
    try {
      const detail = await apiFetch<BlogPreviewData & { transcript?: string | null }>(`/api/admin/${kind}/${id}`);
      setPreview(kind === 'podcasts' && !detail.content ? { ...detail, content: detail.transcript ?? undefined } : detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement de l'aperçu");
    } finally {
      setBusyId(null);
    }
  };

  async function publish(id: string) {
    setMenu(null);
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/${kind}/${id}/publish`, { method: 'POST' });
      patchLocalStatus(id, 'PUBLISHED');
      showToast(`${noun.singular[0].toUpperCase()}${noun.singular.slice(1)} publié`);
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec de la publication.');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setMenu(null);
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/${kind}/${id}/reject`, { method: 'POST' });
      patchLocalStatus(id, 'REFUSED');
      showToast(`${noun.singular[0].toUpperCase()}${noun.singular.slice(1)} rejeté`);
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec du rejet.');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setMenu(null);
    if (!window.confirm(`Supprimer ce ${noun.singular} ? Il sera archivé.`)) return;
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/api/admin/${kind}/${id}`, { method: 'DELETE' });
      patchLocalStatus(id, 'ARCHIVED');
      showToast(`${noun.singular[0].toUpperCase()}${noun.singular.slice(1)} supprimé`);
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec de la suppression.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleUnits(courseId: string) {
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(courseId)) next.delete(courseId); else next.add(courseId);
      return next;
    });
    if (!unitsByCourse[courseId]) {
      setUnitsByCourse((cur) => ({ ...cur, [courseId]: 'loading' }));
      try {
        const units = await apiFetch<UnitItem[]>(`/api/admin/courses/${courseId}/units`);
        setUnitsByCourse((cur) => ({ ...cur, [courseId]: Array.isArray(units) ? units : [] }));
      } catch {
        setUnitsByCourse((cur) => ({ ...cur, [courseId]: [] }));
      }
    }
  }

  function patchLocalUnitStatus(courseId: string, unitId: string, status: string) {
    setUnitsByCourse((cur) => {
      const list = cur[courseId];
      if (!Array.isArray(list)) return cur;
      return { ...cur, [courseId]: list.map((u) => (u.id === unitId ? { ...u, status } : u)) };
    });
  }

  async function publishUnit(courseId: string, unitId: string) {
    setUnitMenu(null);
    setBusyUnitId(unitId);
    try {
      await apiFetch(`/api/admin/courses/${courseId}/units/${unitId}/publish`, { method: 'POST' });
      patchLocalUnitStatus(courseId, unitId, 'PUBLISHED');
      showToast('Unité publiée');
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec de la publication de l’unité.');
    } finally {
      setBusyUnitId(null);
    }
  }

  async function rejectUnit(courseId: string, unitId: string) {
    setUnitMenu(null);
    setBusyUnitId(unitId);
    try {
      await apiFetch(`/api/admin/courses/${courseId}/units/${unitId}/reject`, { method: 'POST' });
      patchLocalUnitStatus(courseId, unitId, 'REFUSED');
      showToast('Unité rejetée');
    } catch (e) {
      setError(e instanceof BffApiError ? e.message : 'Échec du rejet de l’unité.');
    } finally {
      setBusyUnitId(null);
    }
  }

  const menuItem = menu ? items.find((b) => b.id === menu.id) ?? null : null;
  // Nombre total de colonnes du tableau (chevron en plus pour les cours).
  const totalCols = kind === 'courses' ? 7 : 6;
  // Filtré sur le statut courant : une maj optimiste (publier/rejeter) fait disparaître
  // l'item de l'onglet actif sans attendre de refetch, sans clignotement visible.
  const visibleItems = items.filter((b) => b.status === tab);

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: 'var(--primary)', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20,
            border: `1px solid ${tab === t.key ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: tab === t.key ? 'var(--blue)' : '#fff',
            color: tab === t.key ? '#fff' : 'var(--gray-600)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              {kind === 'courses' && <th style={{ ...th, width: 32 }} />}
              <th style={th}>Titre</th>
              <th style={th}>Auteur</th>
              <th style={th}>Domaine</th>
              <th style={th}>Statut</th>
              <th style={th}>{tab === 'SUBMITTED' ? 'Soumis le' : 'Publié le'}</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={td} colSpan={totalCols}>Chargement…</td></tr>
            ) : visibleItems.length === 0 ? (
              <tr><td style={{ ...td, color: 'var(--gray-400)' }} colSpan={totalCols}>
                {tab === 'SUBMITTED' ? `Aucun ${noun.singular} en attente de validation.` : `Aucun ${noun.singular} publié.`}
              </td></tr>
            ) : (
              visibleItems.map((b) => (
                <Fragment key={b.id}>
                  <tr style={{ opacity: busyId === b.id ? .5 : 1 }}>
                    {kind === 'courses' && (
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button type="button" onClick={() => toggleUnits(b.id)} aria-label="Unités" style={{
                          border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-500)',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          transform: expanded.has(b.id) ? 'rotate(90deg)' : 'none', transition: 'transform .15s',
                        }}>
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" /></svg>
                        </button>
                      </td>
                    )}
                    <td style={{ ...td, fontWeight: 600 }}>{b.title}</td>
                    <td style={td}>{(b.authorId && authorNames.get(b.authorId)) || (b.authorId ? `${b.authorId.slice(0, 8)}…` : '—')}</td>
                    <td style={td}>{b.domain === 'NONE' ? '—' : b.domain ?? '—'}</td>
                    <td style={td}><StatusBadge status={b.status} /></td>
                    <td style={td}>{formatDate(tab === 'SUBMITTED' ? b.createdAt : b.publishedAt ?? b.updatedAt)}</td>
                    <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button type="button" title="Actions" disabled={busyId === b.id} onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu((m) => (m?.id === b.id ? null : { id: b.id, x: Math.max(8, r.right - 190), y: r.bottom + 6 }));
                      }} style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: menu?.id === b.id ? 'var(--gray-200)' : 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                      </button>
                    </td>
                  </tr>
                  {kind === 'courses' && expanded.has(b.id) && (
                    <tr>
                      <td />
                      <td colSpan={totalCols - 1} style={{ padding: '0 16px 14px 16px', borderTop: 'none' }}>
                        {unitsByCourse[b.id] === 'loading' ? (
                          <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: '8px 0' }}>Chargement des unités…</div>
                        ) : (unitsByCourse[b.id] as UnitItem[] | undefined)?.length ? (
                          <div style={{ border: '1px solid var(--gray-100)', borderRadius: 8, overflow: 'hidden' }}>
                            {(unitsByCourse[b.id] as UnitItem[]).map((u) => (
                              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--gray-100)', opacity: busyUnitId === u.id ? .5 : 1 }}>
                                <span style={{ fontSize: 12, color: 'var(--gray-400)', minWidth: 18 }}>{u.unit ?? '—'}</span>
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{u.title}</span>
                                <StatusBadge status={u.status} />
                                <button type="button" title="Actions" disabled={busyUnitId === u.id} onClick={(e) => {
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setUnitMenu((m) => (m?.unitId === u.id ? null : { courseId: b.id, unitId: u.id, x: Math.max(8, r.right - 170), y: r.bottom + 6 }));
                                }} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: '8px 0' }}>Aucune unité pour ce cours.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {menu && menuItem && (
        <>
          <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: 190, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.16)', zIndex: 1001, padding: 4, fontSize: 13 }}>
            <button type="button" onClick={() => openPreview(menuItem.id)} style={menuItemStyle('var(--gray-800)')}>Prévisualiser</button>
            {tab === 'SUBMITTED' ? (
              <>
                <button type="button" onClick={() => publish(menuItem.id)} style={menuItemStyle('#16A34A')}>Publier</button>
                <button type="button" onClick={() => reject(menuItem.id)} style={menuItemStyle('#DC2626')}>Rejeter</button>
              </>
            ) : (
              <button type="button" onClick={() => remove(menuItem.id)} style={menuItemStyle('#DC2626')}>Supprimer</button>
            )}
          </div>
        </>
      )}

      {unitMenu && (
        <>
          <div onClick={() => setUnitMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: unitMenu.y, left: unitMenu.x, width: 170, background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: '0 12px 32px rgba(0,0,0,.16)', zIndex: 1001, padding: 4, fontSize: 13 }}>
            <button type="button" onClick={() => publishUnit(unitMenu.courseId, unitMenu.unitId)} style={menuItemStyle('#16A34A')}>Publier</button>
            <button type="button" onClick={() => rejectUnit(unitMenu.courseId, unitMenu.unitId)} style={menuItemStyle('#DC2626')}>Rejeter</button>
          </div>
        </>
      )}

      {preview && (
        <BlogPreviewModal
          blog={preview}
          onClose={() => setPreview(null)}
          coverPath={`/api/education/${kind}/${preview.id}/cover`}
          audioPath={kind === 'podcasts' ? `/api/education/podcasts/${preview.id}/audio` : undefined}
        />
      )}
    </div>
  );
}
