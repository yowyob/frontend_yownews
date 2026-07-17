'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink, useAppRouter } from '@/components/ui/app-link';
import RowMenu, { type MenuItem } from '@/components/education/RowMenu';

type ForumStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
type GroupType = 'FORUM' | 'COMMUNITY' | 'PUBLIC';
type DiscussionGroup = {
  groupId: string; name: string; description?: string | null;
  type: GroupType; status: ForumStatus;
  creatorId?: string | null; creatorName?: string | null;
  members?: string[] | null;
  createdAt?: string | null; updatedAt?: string | null;
};

type StatusTab = 'ALL' | ForumStatus;
const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: 'ALL', label: 'Tous' },
  { key: 'PENDING', label: 'En attente de validation' },
  { key: 'VALIDATED', label: 'Validés' },
  { key: 'REJECTED', label: 'Rejetés' },
];

const STATUS_LABEL: Record<ForumStatus, string> = { PENDING: 'En attente', VALIDATED: 'Validé', REJECTED: 'Rejeté' };
const STATUS_COLOR: Record<ForumStatus, string> = { PENDING: '#F59E0B', VALIDATED: '#16A34A', REJECTED: '#DC2626' };
const TYPE_LABELS: Record<GroupType, string> = { FORUM: 'Forum', COMMUNITY: 'Communauté', PUBLIC: 'Forum public' };

function formatDate(s?: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('fr-FR'); } catch { return s; }
}

function StatusBadge({ status }: { status: ForumStatus }) {
  return (
    <span style={{
      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
      background: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status],
    }}>{STATUS_LABEL[status]}</span>
  );
}

// ── Panneau « Forums de la communauté » ──
// Les forums validés sont accessibles à TOUS les utilisateurs du tenant : `/api/forum/groups` →
// KSM `/groups/public` (status=VALIDATED, filtré tenant, sans filtre par créateur). Sans ce
// panneau, l'admin et le rédacteur ne voyaient que leurs propres forums (`/groups/mine`).
function CommunityForums() {
  const [groups, setGroups] = useState<DiscussionGroup[] | null>(null);

  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/forum/groups')
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, []);

  // Les plus récents en premier ; une date absente passe en fin de liste.
  const sorted = [...(groups ?? [])].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );

  return (
    <aside>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '4px' }}>
        Forums de la communauté
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--gray-400)', margin: '0 0 12px' }}>
        Tous les forums validés, les plus récents en premier.
      </p>

      {groups === null ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Chargement…</p>
      ) : sorted.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Aucun forum validé pour le moment.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map((g) => (
            <AppLink
              key={g.groupId}
              href={`/forums/${g.groupId}`}
              style={{
                display: 'block', background: '#fff', border: '1px solid var(--gray-200)',
                borderRadius: '10px', padding: '12px 14px', textDecoration: 'none',
                color: 'inherit', transition: 'box-shadow .15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '3px' }}>{g.name}</div>
              {g.description && (
                <div style={{ fontSize: '12.5px', color: 'var(--gray-500)', lineHeight: 1.45, marginBottom: '6px' }}>
                  {g.description}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '6px' }}>
                  {TYPE_LABELS[g.type] ?? g.type}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(g.createdAt)}</span>
              </div>
            </AppLink>
          ))}
        </div>
      )}
    </aside>
  );
}

// ── Formulaire de création / édition inline ──
function ForumForm({ editing, onDone }: { editing?: DiscussionGroup | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  // Un seul type de forum sur la plateforme : PUBLIC.
  const type: GroupType = 'PUBLIC';
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const submit = async () => {
    setMessage(null);
    if (!name.trim()) { setMessage({ kind: 'err', text: 'Le nom est requis.' }); return; }
    setBusy(true);
    try {
      if (editing) {
        await apiFetch(`/api/forum/groups/${editing.groupId}`, {
          method: 'PUT', body: { name: name.trim(), description: description.trim() || undefined, type },
        });
      } else {
        const body: Record<string, unknown> = { name: name.trim(), description: description.trim() || undefined, type };
        await apiFetch('/api/forum/groups', { method: 'POST', body });
      }
      setMessage({ kind: 'ok', text: editing ? 'Forum modifié.' : 'Forum soumis à validation.' });
      setTimeout(onDone, 600);
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec' });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '18px', border: '1px solid var(--gray-200)', borderRadius: '12px', background: '#fff', marginBottom: '20px' }}>
      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-d)' }}>
        {editing ? 'Modifier le forum' : 'Créer un forum'}
      </h3>
      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Nom du forum *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du forum"
          style={{ width: '100%', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Description <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(facultatif)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="À propos de ce forum…"
          style={{ width: '100%', minHeight: '80px', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      </div>
      {!editing && (
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--gray-400)' }}>
          Votre proposition sera soumise à validation par un administrateur avant d&apos;être publiée.
        </p>
      )}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button type="button" onClick={submit} disabled={!name.trim() || busy} style={{
          border: 'none', borderRadius: '8px', padding: '10px 22px', background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: name.trim() ? 1 : 0.5,
        }}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Soumettre'}</button>
      </div>
    </div>
  );
}

export default function MyForumsWorkspace({ userId }: { userId: string }) {
  const router = useAppRouter();
  const [groups, setGroups] = useState<DiscussionGroup[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscussionGroup | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL');

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<DiscussionGroup[]>('/api/forum/groups/mine');
      setGroups(Array.isArray(data) ? data : []);
    } catch { setGroups([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const myGroups = (groups ?? []).filter((g) => g.creatorId === userId);
  const countByStatus = (s: StatusTab) => s === 'ALL' ? myGroups.length : myGroups.filter((g) => g.status === s).length;
  const filteredMyGroups = statusTab === 'ALL' ? myGroups : myGroups.filter((g) => g.status === statusTab);

  if (editing) {
    return (
      <div>
        <button type="button" onClick={() => setEditing(null)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
           Mes forums
        </button>
        <ForumForm editing={editing} onDone={() => { setEditing(null); load(); }} />
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
           Mes forums
        </button>
        <ForumForm onDone={() => { setShowForm(false); load(); }} />
      </div>
    );
  }

  return (
    <div className="my-forums-grid">
      <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, margin: 0 }}>Mes forums</h2>
        <button type="button" onClick={() => setShowForm(true)} style={{
          border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
        }}>+ Nouveau forum</button>
      </div>

      {groups === null ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400)' }}>Chargement…</div>
      ) : (
        <>
          {/* Mes forums créés */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-700)', marginBottom: '10px' }}>Mes forums créés</h3>

          {/* Onglets de tri par statut */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
            {STATUS_TABS.map((t) => {
              const active = statusTab === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setStatusTab(t.key)} style={{
                  padding: '7px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', borderRadius: '20px',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--gray-200)'}`,
                  background: active ? 'rgba(239,68,68,.08)' : '#fff',
                  color: active ? 'var(--accent)' : 'var(--gray-600)',
                }}>{t.label} ({countByStatus(t.key)})</button>
              );
            })}
          </div>

          {myGroups.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '24px' }}>Aucun forum créé pour le moment.</p>
          ) : filteredMyGroups.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '24px' }}>Aucun forum dans cette catégorie.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {filteredMyGroups.map((g) => {
                const clickable = g.status === 'VALIDATED';
                const menuItems: MenuItem[] = [];
                if (clickable) menuItems.push({ label: 'Ouvrir', onClick: () => router.push(`/forums/${g.groupId}`) });
                menuItems.push({ label: 'Modifier', onClick: () => setEditing(g) });

                return (
                  <div key={g.groupId} style={{
                    border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px', background: '#fff',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{g.name}</span>
                        <StatusBadge status={g.status} />
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '2px 6px', borderRadius: '6px' }}>{TYPE_LABELS[g.type] ?? g.type}</span>
                      </div>
                      {g.description && <div style={{ fontSize: '12.5px', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.description}</div>}
                      <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>Créé le {formatDate(g.createdAt)}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowMenu items={menuItems} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      <CommunityForums />

      <style>{`
        .my-forums-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 28px;
          align-items: start;
          max-width: 1100px;
        }
        @media (max-width: 900px) {
          .my-forums-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
    </div>
  );
}
