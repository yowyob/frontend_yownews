'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

type ForumStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
type DiscussionGroup = { groupId: string; name: string; description?: string | null; type: string; status: ForumStatus; createdAt?: string | null };
type Tab = 'pending' | 'validated' | 'rejected';

function formatDate(s?: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
}

const STATUS_LABEL: Record<ForumStatus, string> = { PENDING: 'En attente', VALIDATED: 'Validé', REJECTED: 'Rejeté' };
const STATUS_COLOR: Record<ForumStatus, string> = { PENDING: '#F59E0B', VALIDATED: '#16A34A', REJECTED: '#DC2626' };

export default function ForumAdminWorkspace() {
  const [tab, setTab] = useState<Tab>('pending');
  const [groups, setGroups] = useState<DiscussionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<DiscussionGroup[]>('/api/forum/groups/admin')
      .then((data) => { setGroups(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = groups.filter((g) => g.status === tab.toUpperCase());

  const act = async (groupId: string, action: 'validate' | 'reject') => {
    setBusy(groupId);
    try {
      const updated = await apiFetch<DiscussionGroup>(`/api/forum/groups/${groupId}/${action}`, { method: 'PUT' });
      setGroups((prev) => prev.map((g) => g.groupId === groupId ? updated : g));
    } catch { /* best-effort */ }
    finally { setBusy(null); }
  };

  const tabStyle = (val: Tab): React.CSSProperties => ({
    padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', borderRadius: '20px',
    border: `1px solid ${tab === val ? 'var(--accent)' : 'var(--gray-200)'}`,
    background: tab === val ? 'rgba(239,68,68,.08)' : '#fff',
    color: tab === val ? 'var(--accent)' : 'var(--gray-600)',
  });

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>Gestion des forums</h2>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {(['pending', 'validated', 'rejected'] as Tab[]).map((t) => (
          <button key={t} type="button" style={tabStyle(t)} onClick={() => setTab(t)}>
            {t === 'pending' ? 'En attente' : t === 'validated' ? 'Validés' : 'Rejetés'}
            {' '}({groups.filter((g) => g.status === t.toUpperCase()).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>Aucun forum {STATUS_LABEL[tab.toUpperCase() as ForumStatus]?.toLowerCase()}.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((g) => (
            <div key={g.groupId} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{g.name}</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${STATUS_COLOR[g.status]}18`, color: STATUS_COLOR[g.status] }}>{STATUS_LABEL[g.status]}</span>
                  <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '6px' }}>{g.type}</span>
                </div>
                {g.description && <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>{g.description}</div>}
                <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '4px' }}>Créé le {formatDate(g.createdAt)}</div>
              </div>
              {g.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button type="button" disabled={busy === g.groupId} onClick={() => act(g.groupId, 'validate')} style={{ border: 'none', borderRadius: '8px', padding: '7px 14px', background: '#16A34A', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Valider</button>
                  <button type="button" disabled={busy === g.groupId} onClick={() => act(g.groupId, 'reject')} style={{ border: 'none', borderRadius: '8px', padding: '7px 14px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Rejeter</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
