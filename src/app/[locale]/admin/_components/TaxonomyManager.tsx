'use client';
import { useState, useEffect, type CSSProperties } from 'react';
import { apiFetch } from '@/lib/api-client';
import { EDUCATION_DOMAINS } from '@/lib/education-domains';

export type TaxonomyItem = {
  id: string;
  name: string;
  description?: string | null;
  domain?: string | null;
  categoryId?: string | null;
  createdAt?: string | null;
};

type CategoryOption = { id: string; name: string };

const DOMAINS = EDUCATION_DOMAINS;

type Props = {
  resource: 'categories' | 'tags';
  singular: string;
  plural: string;
  canDelete: boolean;
};

const emptyCategory = { name: '', description: '', domain: 'EDUCATION' };
const emptyTag = { name: '', description: '', categoryId: '' };

export default function TaxonomyManager({ resource, singular, plural, canDelete }: Props) {
  const [items, setItems] = useState<TaxonomyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCat, setFormCat] = useState(emptyCategory);
  const [formTag, setFormTag] = useState(emptyTag);
  const [submitting, setSubmitting] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const menuItem = menu ? items.find((it) => it.id === menu.id) ?? null : null;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<TaxonomyItem[]>(`/api/education/${resource}`);
        if (!cancelled) { setItems(Array.isArray(data) ? data : []); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resource]);

  // Load category options when managing tags
  useEffect(() => {
    if (resource !== 'tags') return;
    let cancelled = false;
    apiFetch<CategoryOption[]>('/api/education/categories')
      .then((data) => { if (!cancelled && Array.isArray(data)) setCategoryOptions(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [resource]);

  function openAdd() {
    setEditingId(null);
    setFormCat(emptyCategory);
    setFormTag(emptyTag);
    setFormOpen(true);
  }

  function openEdit(it: TaxonomyItem) {
    setMenu(null);
    setEditingId(it.id);
    setFormCat({ name: it.name ?? '', description: it.description ?? '', domain: it.domain ?? 'EDUCATION' });
    setFormTag({ name: it.name ?? '', description: it.description ?? '', categoryId: it.categoryId ?? '' });
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setFormCat(emptyCategory);
    setFormTag(emptyTag);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = (resource === 'tags' ? formTag.name : formCat.name).trim();
    if (!name || submitting) return;
    setSubmitting(true);
    try {
      const body = resource === 'tags'
        ? { name, description: formTag.description.trim() || undefined, categoryId: formTag.categoryId || undefined }
        : { name, description: formCat.description.trim() || undefined, domain: formCat.domain };

      if (editingId) {
        const updated = await apiFetch<TaxonomyItem>(`/api/education/${resource}/${editingId}`, { method: 'PUT', body });
        setItems((prev) => prev.map((it) => (it.id === editingId ? updated : it)));
        showToast(`${cap(singular)} mise(s) à jour`);
      } else {
        const created = await apiFetch<TaxonomyItem>(`/api/education/${resource}`, { method: 'POST', body });
        setItems((prev) => [created, ...prev]);
        showToast(`${cap(singular)} ajoutée`);
      }
      closeForm();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Échec de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(it: TaxonomyItem) {
    setMenu(null);
    if (!window.confirm(`Supprimer « ${it.name} » ?`)) return;
    try {
      await apiFetch(`/api/education/${resource}/${it.id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((x) => x.id !== it.id));
      showToast(`${cap(singular)} supprimée`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Échec de la suppression');
    }
  }

  const currentName = resource === 'tags' ? formTag.name : formCat.name;

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
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 700, color: 'var(--dark)' }}>{cap(plural)}</div>
          <div style={{ fontSize: '13px', color: 'var(--gray-400)', marginTop: '2px' }}>
            {loading ? 'Chargement…' : `${items.length} ${plural} au total`}
          </div>
        </div>
        <button onClick={formOpen && !editingId ? closeForm : openAdd} style={{
          display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '10px',
          border: 'none', background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-d)',
          fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--sh-sm)',
        }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
          Ajouter une {singular}
        </button>
      </div>

      {/* Formulaire */}
      {formOpen && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '14px', boxShadow: 'var(--sh-sm)', padding: '18px 20px', marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--font-d)', fontSize: '14px', fontWeight: 700, color: 'var(--dark)', marginBottom: '14px' }}>
            {editingId ? `Modifier la ${singular}` : `Nouvelle ${singular}`}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={fieldLabel}>Nom</span>
              <input autoFocus
                value={resource === 'tags' ? formTag.name : formCat.name}
                onChange={(e) => resource === 'tags'
                  ? setFormTag({ ...formTag, name: e.target.value })
                  : setFormCat({ ...formCat, name: e.target.value })}
                placeholder={`Nom de la ${singular}`} style={fieldInput} />
            </label>

            {resource === 'categories' && (
              <label style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={fieldLabel}>Domaine</span>
                <select value={formCat.domain} onChange={(e) => setFormCat({ ...formCat, domain: e.target.value })} style={{ ...fieldInput, cursor: 'pointer' }}>
                  {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            )}

            {resource === 'tags' && (
              <label style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={fieldLabel}>Catégorie</span>
                <select value={formTag.categoryId} onChange={(e) => setFormTag({ ...formTag, categoryId: e.target.value })} style={{ ...fieldInput, cursor: 'pointer' }}>
                  <option value="">— Sans catégorie —</option>
                  {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '12px' }}>
            <span style={fieldLabel}>Description</span>
            <textarea
              value={resource === 'tags' ? formTag.description : formCat.description}
              onChange={(e) => resource === 'tags'
                ? setFormTag({ ...formTag, description: e.target.value })
                : setFormCat({ ...formCat, description: e.target.value })}
              rows={2} placeholder="Description (optionnelle)" style={{ ...fieldInput, resize: 'vertical', fontFamily: 'var(--font-b)' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
            <button type="button" onClick={closeForm} style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--gray-200)', background: '#fff', color: 'var(--gray-600)', fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={submitting || !currentName.trim()} style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: 'var(--blue)', color: '#fff', fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 700, cursor: submitting || !currentName.trim() ? 'default' : 'pointer', opacity: submitting || !currentName.trim() ? 0.5 : 1 }}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '14px', boxShadow: 'var(--sh-sm)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                <th style={th}>Nom</th>
                <th style={th}>Description</th>
                <th style={th}>Date de création</th>
                <th style={{ ...th, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={tdEmpty}>Chargement…</td></tr>
              ) : error ? (
                <tr><td colSpan={4} style={{ ...tdEmpty, color: '#DC2626' }}>{error}</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} style={tdEmpty}>Aucune {singular} — cliquez « Ajouter une {singular} ».</td></tr>
              ) : items.map((it, idx) => {
                const badge = resource === 'categories'
                  ? it.domain
                  : it.categoryId ? categoryOptions.find((c) => c.id === it.categoryId)?.name : null;
                return (
                  <tr key={it.id} style={{ borderTop: '1px solid var(--gray-100)', background: idx % 2 === 1 ? 'var(--gray-50)' : '#fff' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }}>{it.name}</span>
                        {badge && <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-d)', background: '#F5F0FF', color: '#7C3AED' }}>{badge}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12.5px', color: 'var(--gray-500)', maxWidth: '420px' }}>
                      {it.description?.trim() ? it.description : <span style={{ color: 'var(--gray-300)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {it.createdAt ? new Date(it.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button title="Actions" onClick={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setMenu((m) => (m?.id === it.id ? null : { id: it.id, x: Math.max(8, r.right - 180), y: r.bottom + 6 }));
                      }} style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: menu?.id === it.id ? 'var(--gray-200)' : 'var(--gray-100)', color: 'var(--gray-600)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Menu ⋮ */}
      {menu && menuItem && (
        <>
          <div onClick={() => setMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000 }} />
          <div style={{ position: 'fixed', top: menu.y, left: menu.x, width: '180px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px', boxShadow: '0 12px 32px rgba(0,0,0,.16)', zIndex: 1001, padding: '4px' }}>
            <button onClick={() => openEdit(menuItem)} style={menuItemStyle('var(--dark)')}>
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> Modifier
            </button>
            {canDelete && (
              <button onClick={() => handleDelete(menuItem)} style={menuItemStyle('#DC2626')}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg> Supprimer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

const th: CSSProperties = { padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' };
const tdEmpty: CSSProperties = { padding: '48px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '14px' };
const fieldLabel: CSSProperties = { fontFamily: 'var(--font-d)', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.5px' };
const fieldInput: CSSProperties = { background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: 'var(--dark)', outline: 'none', fontFamily: 'var(--font-b)', width: '100%' };

function menuItemStyle(color: string): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
    padding: '8px 10px', borderRadius: '7px', border: 'none', background: 'transparent',
    color, fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  };
}
