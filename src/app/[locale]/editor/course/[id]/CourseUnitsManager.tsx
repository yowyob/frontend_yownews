'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { apiFetch } from '@/lib/api-client';
import { useAppRouter } from '@/components/ui/app-link';
import BlockEditor from '@/components/block-editor/BlockEditor';

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

function byUnit(a: CourseUnit, b: CourseUnit) {
  return (a.unit ?? 999) - (b.unit ?? 999);
}

/** Une carte de chapitre, déplaçable par sa poignée. */
function SortableUnit({
  unit,
  index,
  onEdit,
  onDelete,
}: {
  unit: CourseUnit;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: unit.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
        position: 'relative',
        background: '#fff',
        border: '1px solid var(--gray-100)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,.12)' : 'none',
      }}
    >
      {/* Les écouteurs de glissement sont posés sur la SEULE poignée : sinon les boutons de la
          carte deviendraient impossibles à cliquer. */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Glisser pour réordonner"
        aria-label={`Déplacer le chapitre ${unit.title}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '26px', height: '26px', flexShrink: 0,
          border: '1px solid var(--gray-200)', borderRadius: '6px', background: '#fff',
          color: 'var(--gray-400)', cursor: 'grab', touchAction: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
          <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
          <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
        </svg>
      </button>

      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
        {index + 1}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '14px' }}>{unit.title}</div>
        {unit.description && <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>{excerpt(unit.description)}</div>}
      </div>

      {unit.status && (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: unit.status === 'PUBLISHED' ? 'rgba(22,163,74,.1)' : 'rgba(239,68,68,.08)', color: unit.status === 'PUBLISHED' ? '#16A34A' : 'var(--accent)' }}>
          {unit.status}
        </span>
      )}
      <button type="button" onClick={onEdit} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
        Modifier
      </button>
      <button type="button" onClick={onDelete} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
        Supprimer
      </button>
    </div>
  );
}

export default function CourseUnitsManager({ courseId }: { courseId: string }) {
  const router = useAppRouter();
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  // Descriptions = HTML sérialisé par l'éditeur par blocs. `key` bumpé quand on injecte un nouveau
  // HTML de départ (après création, ou à l'ouverture d'un chapitre en édition), car l'éditeur ne
  // relit `value` qu'au montage.
  const [createDesc, setCreateDesc] = useState('');
  const [createKey, setCreateKey] = useState(0);
  const [editDesc, setEditDesc] = useState('');
  const [editKey, setEditKey] = useState(0);

  const sensors = useSensors(
    // Petite distance d'activation : sans elle, un simple clic sur la poignée démarrerait un glissement.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reload = useCallback(() => {
    apiFetch<CourseUnit[]>(`/api/education/courses/${courseId}/units`)
      .then((data) => { setUnits((Array.isArray(data) ? [...data] : []).sort(byUnit)); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Erreur'); setLoading(false); });
  }, [courseId]);

  useEffect(() => { reload(); }, [reload]);

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const hasDescription = createDesc.replace(/<[^>]*>/g, '').trim().length > 0 || /<(img|a)\b/i.test(createDesc);
      const unit = await apiFetch<CourseUnit>(`/api/education/courses/${courseId}/units`, {
        method: 'POST',
        // Le nouveau chapitre se place en fin de liste ; l'ordre se règle ensuite au glisser-déposer.
        body: { title: title.trim(), description: hasDescription ? createDesc : undefined, unit: units.length + 1, domain: 'NONE' },
      });
      setUnits((prev) => [...prev, unit].sort(byUnit));
      setTitle('');
      setCreateDesc(''); setCreateKey((k) => k + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
    } finally { setBusy(false); }
  };

  const remove = async (unitId: string) => {
    const previous = units;
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
    try { await apiFetch(`/api/education/courses/${courseId}/units/${unitId}`, { method: 'DELETE' }); }
    catch (e) {
      setUnits(previous);
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    }
  };

  const openEdit = (unit: CourseUnit) => {
    setEditingId(unit.id);
    setEditTitle(unit.title);
    setEditDesc(unit.description ?? ''); setEditKey((k) => k + 1);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim() || busy) return;
    setBusy(true);
    setError(null);
    const current = units.find((u) => u.id === editingId);
    try {
      const updated = await apiFetch<CourseUnit>(`/api/education/courses/${courseId}/units/${editingId}`, {
        method: 'PUT',
        body: {
          title: editTitle.trim(),
          description: editDesc,
          unit: current?.unit,
          domain: 'NONE',
        },
      });
      setUnits((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...updated } : u)).sort(byUnit));
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally { setBusy(false); }
  };

  /**
   * Persiste le nouvel ordre. Le `PUT` remplace le chapitre : on renvoie donc la charge utile
   * COMPLÈTE (titre + description), sinon la description serait écrasée. Seuls les chapitres dont
   * le rang a réellement changé sont réenvoyés.
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = units.findIndex((u) => u.id === active.id);
    const newIndex = units.findIndex((u) => u.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = units;
    const reordered = arrayMove(units, oldIndex, newIndex).map((u, i) => ({ ...u, unit: i + 1 }));
    setUnits(reordered); // optimiste : la liste bouge tout de suite
    setError(null);

    const changed = reordered.filter((u) => {
      const before = previous.find((p) => p.id === u.id);
      return before && before.unit !== u.unit;
    });

    try {
      await Promise.all(
        changed.map((u) =>
          apiFetch(`/api/education/courses/${courseId}/units/${u.id}`, {
            method: 'PUT',
            body: { title: u.title, description: u.description ?? '', unit: u.unit, domain: 'NONE' },
          }),
        ),
      );
    } catch (e) {
      setUnits(previous); // rollback : l'ordre affiché doit refléter ce qui est réellement enregistré
      setError(e instanceof Error ? e.message : "L'ordre n'a pas pu être enregistré.");
    }
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

      {editingId ? (
        <div style={{ background: '#fff', border: '1px solid var(--primary)', borderRadius: '14px', padding: '22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>Modifier l&apos;unité</h2>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>Titre *</label>
            <input style={fieldStyle} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '8px' }}>Description</label>
            <BlockEditor key={editKey} value={editDesc} onChange={setEditDesc} mode="education" uploadEndpoint="/api/education/media" />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={saveEdit} disabled={!editTitle.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--primary)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: editTitle.trim() ? 1 : 0.5 }}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button type="button" onClick={() => setEditingId(null)} disabled={busy} style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '9px 18px', background: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100)', borderRadius: '14px', padding: '22px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '15px', fontWeight: 700, margin: '0 0 14px' }}>Nouvelle unité</h2>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '4px' }}>Titre *</label>
            <input style={fieldStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de l'unité" />
          </div>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: '8px' }}>Description</label>
            <BlockEditor key={createKey} value={createDesc} onChange={setCreateDesc} mode="education" uploadEndpoint="/api/education/media" />
          </div>
          <button type="button" onClick={create} disabled={!title.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: title.trim() ? 1 : 0.5 }}>
            {busy ? 'Création…' : 'Créer l\'unité'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>Chargement…</div>
      ) : units.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucune unité pour ce cours.</p>
      ) : (
        <>
          <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '10px' }}>
            Glissez un chapitre par sa poignée pour changer son ordre.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={units.map((u) => u.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {units.map((u, i) => (
                  <SortableUnit
                    key={u.id}
                    unit={u}
                    index={i}
                    onEdit={() => openEdit(u)}
                    onDelete={() => remove(u.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}
