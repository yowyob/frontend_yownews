'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import RowMenu, { type MenuItem } from '@/components/education/RowMenu';

type ForumStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
type GroupType = 'FORUM' | 'COMMUNITY' | 'PUBLIC';
type DiscussionGroup = {
  groupId: string; name: string; description?: string | null;
  type: GroupType; status: ForumStatus;
  creatorId?: string | null; creatorName?: string | null;
  createdAt?: string | null;
};

const TABS: { key: ForumStatus; label: string }[] = [
  { key: 'PENDING', label: 'En attente' },
  { key: 'VALIDATED', label: 'Validés' },
  { key: 'REJECTED', label: 'Rejetés' },
];

const STATUS_BADGE: Record<ForumStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'En attente', bg: '#FEF9EC', color: '#B45309' },
  VALIDATED: { label: 'Validé', bg: 'rgba(34,197,94,.1)', color: '#16A34A' },
  REJECTED: { label: 'Rejeté', bg: '#FEF2F2', color: '#DC2626' },
};

const TYPE_LABELS: Record<GroupType, string> = { FORUM: 'Forum', COMMUNITY: 'Communauté', PUBLIC: 'Forum public' };

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-100)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.5px' };

function StatusBadge({ statut }: { statut: ForumStatus }) {
  const b = STATUS_BADGE[statut];
  return <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>{b.label}</span>;
}

// ── Modal d'édition ──
function EditModal({ group, onClose, onSaved }: { group: DiscussionGroup; onClose: () => void; onSaved: (g: DiscussionGroup) => void }) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [type, setType] = useState<GroupType>(group.type);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setBusy(true);
    try {
      const updated = await apiFetch<DiscussionGroup>(`/api/forum/groups/${group.groupId}`, {
        method: 'PUT', body: { name: name.trim(), description: description.trim() || undefined, type },
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec');
    } finally { setBusy(false); }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '460px', boxShadow: '0 12px 40px rgba(0,0,0,.25)' }}>
        <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '16px', fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>Modifier le forum</h3>
        {error && <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: '#FEF2F2', color: '#B91C1C', marginBottom: '12px' }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Type</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['FORUM', 'PUBLIC', 'COMMUNITY'] as GroupType[]).map((t) => (
                <button key={t} type="button" onClick={() => setType(t)} style={{
                  border: `1px solid ${type === t ? 'var(--accent)' : '#e5e7eb'}`,
                  background: type === t ? 'rgba(239,68,68,.08)' : '#fff',
                  color: type === t ? 'var(--accent)' : '#374151',
                  borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}>{TYPE_LABELS[t]}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', color: '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>Annuler</button>
          <button type="button" onClick={submit} disabled={!name.trim() || busy} style={{
            border: 'none', borderRadius: '8px', padding: '8px 18px', background: 'var(--accent)', color: '#fff',
            fontSize: '13px', fontWeight: 700, cursor: busy ? 'default' : 'pointer', opacity: name.trim() ? 1 : 0.5,
          }}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}

export default function ForumModerationWorkspace() {
  const [tab, setTab] = useState<ForumStatus>('PENDING');
  const [items, setItems] = useState<DiscussionGroup[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<DiscussionGroup | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const data = await apiFetch<DiscussionGroup[]>('/api/forum/groups/admin');
      setItems(Array.isArray(data) ? data : []);
    } catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (items ?? []).filter((g) => g.status === tab);

  const act = async (groupId: string, action: 'validate' | 'reject') => {
    setBusyId(groupId); setError(null);
    try {
      const updated = await apiFetch<DiscussionGroup>(`/api/forum/groups/${groupId}/${action}`, { method: 'PUT' });
      setItems((prev) => prev?.map((g) => g.groupId === groupId ? updated : g) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec');
    } finally { setBusyId(null); }
  };

  const remove = async (groupId: string) => {
    if (!window.confirm('Supprimer définitivement ce forum et tout son contenu ?')) return;
    setBusyId(groupId); setError(null);
    try {
      await apiFetch(`/api/forum/groups/${groupId}`, { method: 'DELETE' });
      setItems((prev) => prev?.filter((g) => g.groupId !== groupId) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la suppression');
    } finally { setBusyId(null); }
  };

  const menuFor = (g: DiscussionGroup): MenuItem[] => {
    const del: MenuItem = { label: 'Supprimer', onClick: () => remove(g.groupId), danger: true };
    const edit: MenuItem = { label: 'Modifier', onClick: () => setEditingGroup(g) };
    if (g.status === 'PENDING') return [
      { label: 'Valider', onClick: () => act(g.groupId, 'validate') },
      edit,
      { label: 'Rejeter', onClick: () => act(g.groupId, 'reject'), danger: true },
    ];
    if (g.status === 'VALIDATED') return [edit, { label: 'Rejeter', onClick: () => act(g.groupId, 'reject'), danger: true }, del];
    // REJECTED
    return [{ label: 'Valider', onClick: () => act(g.groupId, 'validate') }, del];
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Gestion des forums</h2>

      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20,
            border: `1px solid ${tab === t.key ? 'var(--blue)' : 'var(--gray-200)'}`,
            background: tab === t.key ? 'var(--blue)' : '#fff',
            color: tab === t.key ? '#fff' : 'var(--gray-600)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{t.label} ({(items ?? []).filter((g) => g.status === t.key).length})</button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={th}>Forum</th>
              <th style={th}>Créateur</th>
              <th style={th}>Type</th>
              <th style={th}>Statut</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr><td style={td} colSpan={5}>Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td style={{ ...td, color: 'var(--gray-400)' }} colSpan={5}>Aucun forum ici.</td></tr>
            ) : filtered.map((g) => (
              <tr key={g.groupId} style={{ opacity: busyId === g.groupId ? 0.5 : 1 }}>
                <td style={td}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{g.name}</div>
                    {g.description && <div style={{ fontSize: 12.5, color: 'var(--gray-500)' }}>{g.description}</div>}
                  </div>
                </td>
                <td style={td}>{g.creatorName || '—'}</td>
                <td style={td}><span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '6px' }}>{TYPE_LABELS[g.type] ?? g.type}</span></td>
                <td style={td}><StatusBadge statut={g.status} /></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <RowMenu disabled={busyId === g.groupId} items={menuFor(g)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingGroup && (
        <EditModal
          group={editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={(updated) => {
            setItems((prev) => prev?.map((g) => g.groupId === updated.groupId ? updated : g) ?? prev);
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
}
