'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink, useAppRouter } from '@/components/ui/app-link';

type GroupType = 'FORUM' | 'COMMUNITY';
type DiscussionGroup = {
  groupId: string; name: string; description?: string | null;
  type: GroupType; parentCommunityId?: string | null; createdAt?: string | null;
};

const TYPE_LABELS: Record<GroupType, string> = { FORUM: 'Forum', COMMUNITY: 'Communauté' };

function matchesMode(type: GroupType, mode: 'FORUM' | 'COMMUNITY') {
  return mode === 'COMMUNITY' ? type === 'COMMUNITY' : type === 'FORUM';
}

function formatDate(s?: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
}

// Catalogue des espaces validés du tenant dont l'utilisateur ne fait PAS partie (ni créateur, ni
// membre). On croise `/api/forum/groups` (publics validés) avec `/api/forum/groups/mine` (créés +
// rejoints) pour retirer ceux déjà rejoints/créés.
export default function ForumCatalogue({ userId }: { userId: string }) {
  void userId; // l'appartenance est déterminée via /mine (créés + rejoints), pas via l'id seul.
  const router = useAppRouter();
  const [groups, setGroups] = useState<DiscussionGroup[] | null>(null);
  const [mode, setMode] = useState<'FORUM' | 'COMMUNITY'>('FORUM');

  useEffect(() => {
    Promise.all([
      apiFetch<DiscussionGroup[]>('/api/forum/groups').catch(() => []),
      apiFetch<DiscussionGroup[]>('/api/forum/groups/mine').catch(() => []),
    ]).then(([all, mine]) => {
      const mineIds = new Set((Array.isArray(mine) ? mine : []).map((g) => g.groupId));
      setGroups((Array.isArray(all) ? all : []).filter((g) => !mineIds.has(g.groupId)));
    });
  }, []);

  const isCommunity = mode === 'COMMUNITY';
  const shown = [...(groups ?? [])]
    // Les forums enfants d'une communauté ne se découvrent qu'à l'intérieur de leur communauté.
    .filter((g) => matchesMode(g.type, mode) && !g.parentCommunityId)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <button type="button" onClick={() => router.back()} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
        ← Retour
      </button>

      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>Catalogue des espaces</h1>
      <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: '4px 0 18px' }}>
        Découvrez tous les {isCommunity ? 'communautés' : 'forums'} validés que vous n&apos;avez pas encore rejoints.
      </p>

      {/* Bascule Forums / Communautés */}
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'var(--gray-100)', borderRadius: '10px', marginBottom: '18px' }}>
        {([['FORUM', 'Forums'], ['COMMUNITY', 'Communautés']] as const).map(([m, label]) => {
          const on = mode === m;
          return (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer',
              background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--gray-600)', transition: 'all .15s',
            }}>{label}</button>
          );
        })}
      </div>

      {groups === null ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : shown.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
          {isCommunity ? 'Aucune communauté à découvrir pour le moment.' : 'Aucun forum à découvrir pour le moment.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shown.map((g) => (
            <AppLink key={g.groupId} href={`/forums/${g.groupId}`} style={{
              display: 'block', background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px',
              padding: '16px 18px', textDecoration: 'none', color: 'inherit', transition: 'box-shadow .15s',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{g.name}</div>
              {g.description && <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginBottom: '8px', lineHeight: 1.45 }}>{g.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.03em', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {TYPE_LABELS[g.type] ?? g.type}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(g.createdAt)}</span>
              </div>
            </AppLink>
          ))}
        </div>
      )}
    </div>
  );
}
