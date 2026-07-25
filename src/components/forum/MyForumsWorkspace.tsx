'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api-client';
import { AppLink, useAppRouter } from '@/components/ui/app-link';
import RowMenu, { type MenuItem } from '@/components/education/RowMenu';

type ForumStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
type GroupType = 'FORUM' | 'COMMUNITY';
type DiscussionGroup = {
  groupId: string; name: string; description?: string | null;
  type: GroupType; status: ForumStatus;
  creatorId?: string | null; creatorName?: string | null;
  members?: string[] | null;
  parentCommunityId?: string | null;
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
const TYPE_LABELS: Record<GroupType, string> = { FORUM: 'Forum', COMMUNITY: 'Communauté' };

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

// Un groupe correspond-il au mode courant ?
function matchesMode(type: GroupType, mode: 'FORUM' | 'COMMUNITY') {
  return mode === 'COMMUNITY' ? type === 'COMMUNITY' : type === 'FORUM';
}

// ── Panneau latéral « Forums de la communauté » / « Communautés populaires » ──
// Les espaces validés sont accessibles à TOUS les utilisateurs du tenant : `/api/forum/groups` →
// KSM `/groups/public` (status=VALIDATED, filtré tenant, sans filtre par créateur). On n'affiche
// ici que les espaces du mode courant dont l'utilisateur ne fait PAS déjà partie (excludeIds =
// ses espaces créés + rejoints), limités aux plus récents ; le catalogue complet est accessible
// via le bouton en bas.
const SIDEBAR_LIMIT = 5;
function CommunityForums({ mode, excludeIds }: { mode: 'FORUM' | 'COMMUNITY'; excludeIds: Set<string> }) {
  const [groups, setGroups] = useState<DiscussionGroup[] | null>(null);

  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/forum/groups')
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, []);

  // Filtré par mode + hors espaces de l'utilisateur ; les plus récents en premier.
  const sorted = [...(groups ?? [])]
    // Les forums enfants d'une communauté ne se découvrent qu'à l'intérieur de leur communauté.
    .filter((g) => matchesMode(g.type, mode) && !g.parentCommunityId && !excludeIds.has(g.groupId))
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  const shown = sorted.slice(0, SIDEBAR_LIMIT);

  const heading = mode === 'COMMUNITY' ? 'Communautés populaires' : 'Forums de la communauté';
  const emptyText = mode === 'COMMUNITY' ? 'Aucune communauté à découvrir pour le moment.' : 'Aucun forum à découvrir pour le moment.';

  return (
    <aside style={{
      background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '14px', padding: '18px',
      alignSelf: 'start',
    }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--dark)', marginBottom: '4px', fontFamily: 'var(--font-d)' }}>
        {heading}
      </h3>
      <p style={{ fontSize: '12px', color: 'var(--gray-400)', margin: '0 0 14px' }}>
        Tous les espaces validés, les plus récents en premier.
      </p>

      {groups === null ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Chargement…</p>
      ) : shown.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '13px' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {shown.map((g) => (
            <AppLink
              key={g.groupId}
              href={`/forums/${g.groupId}`}
              style={{
                display: 'block', background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
                borderRadius: '10px', padding: '12px 14px', textDecoration: 'none',
                color: 'inherit', transition: 'box-shadow .15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              <div style={{ fontWeight: 700, fontSize: '13.5px', marginBottom: '3px' }}>{g.name}</div>
              {g.description && (
                <div style={{ fontSize: '12.5px', color: 'var(--gray-500)', lineHeight: 1.45, marginBottom: '8px' }}>
                  {g.description}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.03em', color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '3px 8px', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {TYPE_LABELS[g.type] ?? g.type}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>{formatDate(g.createdAt)}</span>
              </div>
            </AppLink>
          ))}
        </div>
      )}

      <AppLink
        href="/forums/catalogue"
        style={{
          display: 'block', textAlign: 'center', marginTop: '14px', padding: '11px 14px',
          border: '1px dashed var(--gray-300)', borderRadius: '10px', textDecoration: 'none',
          color: 'var(--gray-600)', fontSize: '13px', fontWeight: 600, transition: 'all .15s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300)'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-600)'; }}
      >
        Voir tout le catalogue
      </AppLink>
    </aside>
  );
}

// ── Formulaire de création / édition inline ──
function ForumForm({ editing, onDone, initialType }: { editing?: DiscussionGroup | null; onDone: () => void; initialType?: 'FORUM' | 'COMMUNITY' }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  // Le type est dérivé de l'onglet actif (initialType) à la création, ou du groupe édité — pas de
  // sélecteur : on est déjà dans la vue « Forums » ou « Communautés ».
  const type: 'FORUM' | 'COMMUNITY' = editing?.type === 'COMMUNITY' ? 'COMMUNITY' : (initialType ?? 'FORUM');
  const isCommunity = type === 'COMMUNITY';
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
        {editing
          ? (type === 'COMMUNITY' ? 'Modifier la communauté' : 'Modifier le forum')
          : (type === 'COMMUNITY' ? 'Créer une communauté' : 'Créer un forum')}
      </h3>
      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Nom {isCommunity ? 'de la communauté' : 'du forum'} *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={isCommunity ? 'Nom de la communauté' : 'Nom du forum'}
          style={{ width: '100%', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' }} />
      </div>
      <div>
        <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Description <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(facultatif)</span></label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isCommunity ? 'À propos de cette communauté…' : 'À propos de ce forum…'}
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

// `orgMode` reste accepté (compat appelants) mais n'influe plus sur le choix de type : FORUM et
// COMMUNITY sont désormais proposés partout.
export default function MyForumsWorkspace({ userId }: { userId: string; orgMode?: boolean }) {
  const router = useAppRouter();
  const [groups, setGroups] = useState<DiscussionGroup[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DiscussionGroup | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>('ALL');
  // Vue active : forums (FORUM/PUBLIC) ou communautés. Les deux ne se mélangent jamais.
  const [spaceMode, setSpaceMode] = useState<'FORUM' | 'COMMUNITY'>('FORUM');
  // Sous-onglet : espaces créés par l'utilisateur ou espaces rejoints (membre non créateur).
  const [subTab, setSubTab] = useState<'created' | 'joined'>('created');

  const load = useCallback(() => {
    apiFetch<DiscussionGroup[]>('/api/forum/groups/mine')
      .then((data) => setGroups(Array.isArray(data) ? data : []))
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => { load(); }, [load]);

  const isCommunity = spaceMode === 'COMMUNITY';
  // Les forums enfants d'une communauté se gèrent depuis la communauté, pas dans « Mes forums ».
  const modeGroups = (groups ?? []).filter((g) => matchesMode(g.type, spaceMode) && !g.parentCommunityId);
  const created = modeGroups.filter((g) => g.creatorId === userId);
  const joined = modeGroups.filter((g) => g.creatorId !== userId);
  const activeList = subTab === 'created' ? created : joined;
  const countByStatus = (s: StatusTab) => s === 'ALL' ? activeList.length : activeList.filter((g) => g.status === s).length;
  const filtered = statusTab === 'ALL' ? activeList : activeList.filter((g) => g.status === statusTab);
  // Tous les espaces de l'utilisateur (créés + rejoints, tous types) : exclus du panneau découverte.
  const myGroupIds = new Set((groups ?? []).map((g) => g.groupId));

  const title = isCommunity ? 'Mes communautés' : 'Mes forums';
  const newLabel = isCommunity ? '+ Nouvelle communauté' : '+ Nouveau forum';
  const createdLabel = isCommunity ? 'Communautés créées' : 'Forums créés';
  const joinedLabel = isCommunity ? 'Communautés rejointes' : 'Forums rejoints';

  const setMode = (m: 'FORUM' | 'COMMUNITY') => { setSpaceMode(m); setSubTab('created'); setStatusTab('ALL'); };

  if (editing) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <button type="button" onClick={() => setEditing(null)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
          ← {title}
        </button>
        <ForumForm editing={editing} onDone={() => { setEditing(null); load(); }} />
      </div>
    );
  }

  if (showForm) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <button type="button" onClick={() => setShowForm(false)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
          ← {title}
        </button>
        <ForumForm initialType={spaceMode} onDone={() => { setShowForm(false); load(); }} />
      </div>
    );
  }

  return (
    <div className="my-forums-grid">
      <div style={{ minWidth: 0 }}>
      {/* En-tête : titre + sous-titre à gauche, bouton de création à droite */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: 0 }}>{title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--gray-500)', margin: '4px 0 0' }}>Gérez vos espaces de discussion et suivez leur statut.</p>
        </div>
        <button type="button" onClick={() => setShowForm(true)} style={{
          border: 'none', borderRadius: '8px', padding: '10px 18px', background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
        }}>{newLabel}</button>
      </div>

      {/* Bascule Forums / Communautés */}
      <div style={{ display: 'inline-flex', gap: '4px', padding: '4px', background: 'var(--gray-100)', borderRadius: '10px', marginBottom: '18px' }}>
        {([['FORUM', 'Forums'], ['COMMUNITY', 'Communautés']] as const).map(([m, label]) => {
          const on = spaceMode === m;
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
      ) : (
        <>
          {/* Sous-onglets créés / rejoints */}
          <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--gray-200)', marginBottom: '16px' }}>
            {([['created', createdLabel, created.length], ['joined', joinedLabel, joined.length]] as const).map(([key, label, count]) => {
              const on = subTab === key;
              return (
                <button key={key} type="button" onClick={() => { setSubTab(key); setStatusTab('ALL'); }} style={{
                  border: 'none', background: 'none', cursor: 'pointer', padding: '0 0 10px', marginBottom: '-1px',
                  fontSize: '14px', fontWeight: 700, color: on ? 'var(--dark)' : 'var(--gray-400)',
                  borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: '7px',
                }}>
                  {label}
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: '10px' }}>{count}</span>
                </button>
              );
            })}
          </div>

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

          {activeList.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '24px' }}>
              {subTab === 'created'
                ? (isCommunity ? 'Aucune communauté créée pour le moment.' : 'Aucun forum créé pour le moment.')
                : (isCommunity ? 'Aucune communauté rejointe pour le moment.' : 'Aucun forum rejoint pour le moment.')}
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--gray-400)', fontSize: '13px', marginBottom: '24px' }}>Aucun espace dans cette catégorie.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {filtered.map((g) => {
                const menuItems: MenuItem[] = [];
                if (g.status === 'VALIDATED') menuItems.push({ label: 'Ouvrir', onClick: () => router.push(`/forums/${g.groupId}`) });
                if (g.creatorId === userId) menuItems.push({ label: 'Modifier', onClick: () => setEditing(g) });

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
                    {menuItems.length > 0 && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <RowMenu items={menuItems} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </div>

      <CommunityForums mode={spaceMode} excludeIds={myGroupIds} />

      <style>{`
        .my-forums-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 28px;
          align-items: start;
          max-width: 1100px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .my-forums-grid { grid-template-columns: minmax(0, 1fr); }
        }
      `}</style>
    </div>
  );
}
