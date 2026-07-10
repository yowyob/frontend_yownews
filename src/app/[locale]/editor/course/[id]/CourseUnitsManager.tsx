'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { useAppRouter } from '@/components/ui/app-link';
import RichTextField, { useRichTextEditor } from '@/components/content-editor/RichTextField';

type CourseUnit = {
  id: string;
  title: string;
  description?: string | null;
  unit?: number | null;
  status?: string | null;
};

// La description est stockée en HTML (TipTap) — extrait texte pour un aperçu compact dans la liste.
function excerpt(html: string, max = 140) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export default function CourseUnitsManager({ courseId }: { courseId: string }) {
  const router = useAppRouter();
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [unitNum, setUnitNum] = useState('');
  const [busy, setBusy] = useState(false);
  const descriptionEditor = useRichTextEditor({ placeholder: "Contenu de l'unité (texte, consignes, ressources…)" });

  useEffect(() => {
    apiFetch<CourseUnit[]>(`/api/education/courses/${courseId}/units`)
      .then((data) => { setUnits(Array.isArray(data) ? data : []); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Erreur'); setLoading(false); });
  }, [courseId]);

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const descriptionHtml = descriptionEditor?.getHTML() ?? '';
      const hasDescription = (descriptionEditor?.getText() ?? '').trim().length > 0;
      const unit = await apiFetch<CourseUnit>(`/api/education/courses/${courseId}/units`, {
        method: 'POST',
        body: { title: title.trim(), description: hasDescription ? descriptionHtml : undefined, unit: unitNum ? Number(unitNum) : undefined, domain: 'NONE' },
      });
      setUnits((prev) => [...prev, unit]);
      setTitle(''); setUnitNum(''); descriptionEditor?.commands.clearContent();
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

      <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: '14px', padding: '22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>Nouvelle unité</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>Titre *</label>
            <input style={fieldStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'unité" />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>N° d'ordre</label>
            <input style={fieldStyle} type="number" min="1" value={unitNum} onChange={(e) => setUnitNum(e.target.value)} placeholder="ex. 1" />
          </div>
        </div>
        <div style={{ marginBottom: '14px' }}>
          <RichTextField editor={descriptionEditor} label="Description" minHeight={140} />
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
            <div
              key={u.id}
              style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', transition: 'box-shadow .15s, transform .15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              {u.unit != null && (
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{u.unit}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.title}</div>
                {u.description && <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{excerpt(u.description)}</div>}
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
