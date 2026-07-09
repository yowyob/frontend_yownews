'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import RowMenu from '@/components/education/RowMenu';

type RedacteurStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type RedacteurRequest = { id: string; email: string; nom: string; prenom: string; status: RedacteurStatus; createdAt?: string | null };
type Tab = 'attente' | 'validees';

const td: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-100)' };
const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.5px' };

const STATUS_LABEL: Record<RedacteurStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'En attente', bg: '#FEF9EC', color: '#B45309' },
  APPROVED: { label: 'Validé', bg: 'rgba(34,197,94,.1)', color: '#16A34A' },
  REJECTED: { label: 'Rejeté', bg: '#FEF2F2', color: '#DC2626' },
};

function RedacteurStatusBadge({ status }: { status: RedacteurStatus }) {
  const badge = STATUS_LABEL[status];
  return (
    <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
      {badge.label}
    </span>
  );
}

export default function RedacteurRequestsModeration() {
  const [tab, setTab] = useState<Tab>('attente');
  const [items, setItems] = useState<RedacteurRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (activeTab: Tab) => {
    setItems(null);
    try {
      const url = activeTab === 'attente'
        ? '/api/newsletter/admin/redacteurs/pending'
        : '/api/newsletter/admin/redacteurs/requests?status=APPROVED';
      setItems(await apiFetch<RedacteurRequest[]>(url));
    } catch { setItems([]); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- rechargement au changement d'onglet.
  useEffect(() => { load(tab); }, [tab]);

  const approve = async (id: string) => {
    setBusyId(id); setError(null);
    try {
      await apiFetch(`/api/newsletter/admin/redacteurs/${id}/approve`, { method: 'POST' });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de l’approbation');
    } finally { setBusyId(null); }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Raison du rejet (optionnel) :') ?? '';
    setBusyId(id); setError(null);
    try {
      await apiFetch(`/api/newsletter/admin/redacteurs/${id}/reject`, { method: 'POST', body: { reason } });
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec du rejet');
    } finally { setBusyId(null); }
  };

  const tabStyle = (val: Tab): React.CSSProperties => ({
    padding: '9px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none',
    borderBottom: tab === val ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === val ? 'var(--primary)' : 'var(--gray-500, #6b7280)',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--gray-200)', marginBottom: '16px' }}>
        <button type="button" style={tabStyle('attente')} onClick={() => setTab('attente')}>En attente</button>
        <button type="button" style={tabStyle('validees')} onClick={() => setTab('validees')}>Validées</button>
      </div>

      {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{error}</div>}
      <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)' }}>
              <th style={th}>Nom</th>
              <th style={th}>Email</th>
              <th style={th}>Statut</th>
              <th style={{ ...th, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === null ? (
              <tr><td style={td} colSpan={4}>Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td style={{ ...td, color: 'var(--gray-400)' }} colSpan={4}>{tab === 'attente' ? 'Aucune demande en attente.' : 'Aucune demande validée.'}</td></tr>
            ) : items.map((r) => (
              <tr key={r.id} style={{ opacity: busyId === r.id ? 0.5 : 1 }}>
                <td style={{ ...td, fontWeight: 600 }}>{[r.prenom, r.nom].filter(Boolean).join(' ') || '—'}</td>
                <td style={td}>{r.email}</td>
                <td style={td}><RedacteurStatusBadge status={r.status} /></td>
                <td style={{ ...td, textAlign: 'right' }}>
                  {r.status === 'PENDING' ? (
                    <RowMenu disabled={busyId === r.id} items={[
                      { label: 'Approuver', onClick: () => approve(r.id) },
                      { label: 'Rejeter', onClick: () => reject(r.id), danger: true },
                    ]} />
                  ) : (
                    <span style={{ color: 'var(--gray-300)', fontSize: 12.5 }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
