'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink } from '@/components/ui/app-link';

type GroupType = 'FORUM' | 'COMMUNITY' | 'PUBLIC';
type DiscussionGroup = { groupId: string; name: string; description?: string | null; type: string; createdAt?: string | null };

const TYPE_LABELS: Record<GroupType, string> = { FORUM: 'Forum', COMMUNITY: 'Communauté', PUBLIC: 'Forum public' };

export default function ForumListPage() {
  const [groups, setGroups] = useState<DiscussionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DiscussionGroup[]>('/api/forum/groups');
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createGroup = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = { name: newName.trim(), description: newDesc.trim() || undefined, type: 'PUBLIC' };
      await apiFetch('/api/forum/groups', { method: 'POST', body });
      setNewName(''); setNewDesc(''); setShowForm(false);
      setMessage({ kind: 'ok', text: 'Votre forum a été soumis à validation par un administrateur.' });
      load(); // Recharge la liste
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec de la création' });
    }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>Forums</h1>
        <button type="button" onClick={() => { setShowForm((v) => !v); setMessage(null); }} style={{ border: 'none', borderRadius: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showForm ? 'Annuler' : '+ Proposer un forum'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Proposer un nouveau forum</h3>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom du forum *" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optionnelle)" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-400)' }}>Votre proposition sera soumise à validation par un administrateur avant d&apos;être publiée.</p>
          <button type="button" onClick={createGroup} disabled={!newName.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: newName.trim() ? 1 : 0.5, alignSelf: 'flex-start' }}>
            {busy ? 'Envoi…' : 'Soumettre'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : groups.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>Aucun forum disponible pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {groups.map((g) => (
            <AppLink key={g.groupId} href={`/forums/${g.groupId}`} style={{ display: 'block', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px 20px', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{g.name}</div>
              {g.description && <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '6px' }}>{g.description}</div>}
              <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: '6px' }}>{TYPE_LABELS[g.type as GroupType] ?? g.type}</span>
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}
