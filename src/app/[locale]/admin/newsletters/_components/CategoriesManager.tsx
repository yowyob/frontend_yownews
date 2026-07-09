'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

type Categorie = { id: string; nom: string; description?: string | null };

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Categorie[]>('/api/newsletter/categories').then(setCategories).catch(() => {});
  }, []);

  const startEdit = (c: Categorie) => { setEditId(c.id); setNom(c.nom); setDescription(c.description ?? ''); };
  const cancelEdit = () => { setEditId(null); setNom(''); setDescription(''); };

  const save = async () => {
    if (!nom.trim() || busy) return;
    setBusy(true);
    try {
      if (editId) {
        const updated = await apiFetch<Categorie>(`/api/newsletter/categories/${editId}`, { method: 'PUT', body: { nom: nom.trim(), description: description.trim() || undefined } });
        setCategories((prev) => prev.map((c) => c.id === editId ? updated : c));
      } else {
        const created = await apiFetch<Categorie>('/api/newsletter/categories', { method: 'POST', body: { nom: nom.trim(), description: description.trim() || undefined } });
        setCategories((prev) => [...prev, created]);
      }
      cancelEdit();
    } catch { /* best-effort */ }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    try { await apiFetch(`/api/newsletter/categories/${id}`, { method: 'DELETE' }); } catch { /* best-effort */ }
  };

  return (
    <div>
      <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Catégories newsletter</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {categories.map((c) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.nom}</div>
              {c.description && <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{c.description}</div>}
            </div>
            <button type="button" onClick={() => startEdit(c)} style={{ border: 'none', background: 'none', color: 'var(--blue)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Modifier</button>
            <button type="button" onClick={() => remove(c.id)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Supprimer</button>
          </div>
        ))}
        {categories.length === 0 && <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Aucune catégorie.</p>}
      </div>
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{editId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</h4>
        <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom *" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnelle)" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={save} disabled={!nom.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: nom.trim() ? 1 : 0.5 }}>
            {editId ? 'Enregistrer' : 'Créer'}
          </button>
          {editId && <button type="button" onClick={cancelEdit} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 14px', background: '#fff', fontSize: '13px', cursor: 'pointer' }}>Annuler</button>}
        </div>
      </div>
    </div>
  );
}
