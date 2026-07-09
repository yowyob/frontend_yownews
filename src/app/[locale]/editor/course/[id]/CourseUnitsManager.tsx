'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAppRouter } from '@/components/ui/app-link';

type CourseUnit = {
  id: string;
  title: string;
  description?: string | null;
  unit?: number | null;
  status?: string | null;
};

export default function CourseUnitsManager({ courseId }: { courseId: string }) {
  const router = useAppRouter();
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [unitNum, setUnitNum] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<CourseUnit[]>(`/api/education/courses/${courseId}/units`)
      .then((data) => { setUnits(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Erreur'); setLoading(false); });
  }, [courseId]);

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const unit = await apiFetch<CourseUnit>(`/api/education/courses/${courseId}/units`, {
        method: 'POST',
        body: { title: title.trim(), description: description.trim() || undefined, unit: unitNum ? Number(unitNum) : undefined, domain: 'NONE' },
      });
      setUnits((prev) => [...prev, unit]);
      setTitle(''); setDescription(''); setUnitNum('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally { setBusy(false); }
  };

  const remove = async (unitId: string) => {
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    try { await apiFetch(`/api/education/courses/${courseId}/units/${unitId}`, { method: 'DELETE' }); }
    catch { /* best-effort, unité déjà retirée du state */ }
  };

  const fieldStyle: React.CSSProperties = { border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button type="button" onClick={() => router.back()} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '6px 12px', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
           Retour
        </button>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '22px', fontWeight: 800, margin: 0 }}>Unités du cours</h1>
      </div>

      {error && <div style={{ background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>Nouvelle unité</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>Titre *</label>
            <input style={fieldStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'unité" />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>N° d'ordre</label>
            <input style={fieldStyle} type="number" min="1" value={unitNum} onChange={(e) => setUnitNum(e.target.value)} placeholder="ex. 1" />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>Description</label>
            <input style={fieldStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description courte" />
          </div>
        </div>
        <button type="button" onClick={create} disabled={!title.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: title.trim() ? 1 : 0.5 }}>
          {busy ? 'Création…' : 'Créer l\'unité'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>Chargement…</div>
      ) : units.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune unité pour ce cours.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {units.sort((a, b) => (a.unit ?? 999) - (b.unit ?? 999)).map((u) => (
            <div key={u.id} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {u.unit != null && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{u.unit}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.title}</div>
                {u.description && <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{u.description}</div>}
              </div>
              {u.status && (
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: u.status === 'PUBLISHED' ? 'rgba(22,163,74,.1)' : 'rgba(239,68,68,.08)', color: u.status === 'PUBLISHED' ? '#16A34A' : 'var(--accent)' }}>
                  {u.status}
                </span>
              )}
              <button type="button" onClick={() => remove(u.id)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
