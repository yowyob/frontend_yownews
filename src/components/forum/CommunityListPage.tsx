'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink } from '@/components/ui/app-link';

type DiscussionGroup = {
  groupId: string;
  name: string;
  description?: string | null;
  type: string;
  status?: string | null;
  parentCommunityId?: string | null;
};

// Fusionne les communautés découvrables (VALIDATED, via /api/forum/groups) avec celles de
// l'utilisateur courant (via /api/forum/groups/mine, qui inclut ses PENDING en tant que créateur),
// dédupliquées par groupId. Ainsi un créateur voit sa communauté « en attente » avant validation.
function mergeById(a: DiscussionGroup[], b: DiscussionGroup[]): DiscussionGroup[] {
  const map = new Map<string, DiscussionGroup>();
  for (const g of [...a, ...b]) map.set(g.groupId, g);
  return [...map.values()];
}

export default function CommunityListPage() {
  const [communities, setCommunities] = useState<DiscussionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Recharge la liste (fusion communautés publiques VALIDATED + celles du user, dont ses PENDING).
  const reload = useCallback(async () => {
    const [pub, mine] = await Promise.all([
      apiFetch<DiscussionGroup[]>('/api/forum/groups').catch(() => []),
      apiFetch<DiscussionGroup[]>('/api/forum/groups/mine').catch(() => []),
    ]);
    const isCommunity = (g: DiscussionGroup) => g.type === 'COMMUNITY' && !g.parentCommunityId;
    setCommunities(mergeById(
      (Array.isArray(pub) ? pub : []).filter(isCommunity),
      (Array.isArray(mine) ? mine : []).filter(isCommunity),
    ));
  }, []);

  // Chargement initial : IIFE async + garde `cancelled` (idiome du repo, pas de setState synchrone
  // dans le corps de l'effet — `loading` démarre déjà à true).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { if (!cancelled) await reload(); }
      catch { /* liste vide par défaut */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const createCommunity = async () => {
    if (!newName.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      // La route BFF ajoute automatiquement members:[créateur] pour une COMMUNITY (exigence KSM).
      await apiFetch('/api/forum/groups', {
        method: 'POST',
        body: { name: newName.trim(), description: newDesc.trim() || undefined, type: 'COMMUNITY' },
      });
      setNewName(''); setNewDesc(''); setShowForm(false);
      setMessage({ kind: 'ok', text: 'Votre communauté a été soumise à validation par un administrateur.' });
      reload().catch(() => { /* best-effort */ });
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec de la création' });
    }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>Communautés</h1>
        <button type="button" onClick={() => { setShowForm((v) => !v); setMessage(null); }} style={{ border: 'none', borderRadius: '8px', padding: '8px 16px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showForm ? 'Annuler' : '+ Créer une communauté'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>Créer une nouvelle communauté</h3>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la communauté *" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optionnelle)" style={{ border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 12px', fontSize: '14px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-400)' }}>
            Une communauté est privée : l&apos;adhésion se fait sur demande, approuvée par son créateur.
            Votre proposition sera d&apos;abord validée par un administrateur avant d&apos;être publiée.
          </p>
          <button type="button" onClick={createCommunity} disabled={!newName.trim() || busy} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: newName.trim() ? 1 : 0.5, alignSelf: 'flex-start' }}>
            {busy ? 'Envoi…' : 'Soumettre'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : communities.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>Aucune communauté disponible pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {communities.map((g) => {
            const pending = g.status === 'PENDING';
            return (
              <AppLink key={g.groupId} href={`/forums/${g.groupId}`} style={{ display: 'block', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '18px 20px', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>{g.name}</span>
                  {pending && <span style={{ fontSize: '10px', fontWeight: 700, color: '#B45309', background: '#FEF9EC', padding: '2px 8px', borderRadius: '20px' }}>En attente de validation</span>}
                </div>
                {g.description && <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '6px' }}>{g.description}</div>}
                <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: '6px' }}>Communauté</span>
              </AppLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
