import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';

type JoinRequest = {
  requestId: string;
  groupId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export default function CommunityManagerModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadRequests = async () => {
    try {
      const data = await apiFetch<JoinRequest[]>(`/api/forum/groups/${groupId}/requests`);
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [groupId]);

  const actOnRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setBusy(requestId);
    setMessage(null);
    try {
      await apiFetch(`/api/forum/groups/requests/${requestId}/${action}`, { method: 'PUT' });
      setRequests((prev) => prev.filter((r) => r.requestId !== requestId));
      setMessage({ kind: 'ok', text: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès.` });
    } catch (e: any) {
      setMessage({ kind: 'err', text: e.message || 'Erreur lors du traitement de la demande.' });
    } finally {
      setBusy(null);
    }
  };

  const directAddMember = async () => {
    if (!newMemberId.trim()) return;
    setAddBusy(true);
    setMessage(null);
    try {
      await apiFetch(`/api/forum/groups/${groupId}/members`, { method: 'POST', body: { memberId: newMemberId.trim() } });
      setMessage({ kind: 'ok', text: 'Membre ajouté avec succès.' });
      setNewMemberId('');
    } catch (e: any) {
      setMessage({ kind: 'err', text: e.message || 'Erreur lors de l\'ajout du membre.' });
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, margin: 0 }}>Gérer la communauté</h2>
          <button type="button" onClick={onClose} style={{ background: 'var(--gray-100)', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)' }}>✕</button>
        </div>

        {message && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>
            {message.text}
          </div>
        )}

        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>Ajout direct de membre</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="ID du membre (UUID)"
              style={{ flex: 1, border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }}
            />
            <button
              type="button"
              onClick={directAddMember}
              disabled={!newMemberId.trim() || addBusy}
              style={{ border: 'none', borderRadius: '8px', padding: '0 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: newMemberId.trim() && !addBusy ? 1 : 0.5 }}
            >
              {addBusy ? 'Ajout...' : 'Ajouter'}
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', borderBottom: '1px solid var(--gray-100)', paddingBottom: '8px' }}>Demandes d'adhésion en attente</h3>
          {loading ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Chargement...</div>
          ) : requests.length === 0 ? (
            <div style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '20px', background: 'var(--gray-50)', borderRadius: '8px' }}>Aucune demande en attente.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {requests.map((req) => (
                <div key={req.requestId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--gray-50)', border: '1px solid var(--gray-100)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '13px', color: 'var(--gray-700)' }}>
                    Utilisateur: <span style={{ fontFamily: 'monospace', color: 'var(--gray-900)' }}>{req.userId}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => actOnRequest(req.requestId, 'approve')}
                      disabled={busy === req.requestId}
                      style={{ border: 'none', borderRadius: '6px', padding: '6px 12px', background: '#16A34A', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: busy === req.requestId ? 0.5 : 1 }}
                    >
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => actOnRequest(req.requestId, 'reject')}
                      disabled={busy === req.requestId}
                      style={{ border: 'none', borderRadius: '6px', padding: '6px 12px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: busy === req.requestId ? 0.5 : 1 }}
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
