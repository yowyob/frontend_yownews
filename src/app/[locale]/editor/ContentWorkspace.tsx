'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import ContentEditor from '@/components/content-editor/ContentEditor';
import RichTextField, { useRichTextEditor } from '@/components/content-editor/RichTextField';
import Select from '@/components/content-editor/Select';
import type { ContentTypeConfig, ExtraBodyResult, InitialContent } from '@/components/content-editor/types';
import { clearDraft, isDraftMeaningful, loadDraft } from '@/components/content-editor/draftCache';
import RowMenu from '@/components/education/RowMenu';
import StatusBadge from '@/components/education/StatusBadge';
import BlogPreviewModal, { type BlogPreviewData } from '@/components/education/BlogPreviewModal';
import { useAppRouter } from '@/components/ui/app-link';

export type WorkspaceKind = 'courses' | 'podcasts';

type ContentItem = {
  id: string;
  title: string;
  domain?: string | null;
  status?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

type ContentDetail = ContentItem & {
  description?: string | null;
  customDomain?: string | null;
  freeTags?: string[] | null;
  freeCategories?: string[] | null;
  categories?: string[] | null;
  tags?: string[] | null;
  trainerName?: string | null;
  duration?: string | null;
  level?: string | null;
  transcript?: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function formatDateTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateTimeFormatter.format(d);
}

const KIND_META: Record<WorkspaceKind, { noun: string; title: string; subtitle: string; listLabel: string }> = {
  courses: { noun: 'Cours', title: 'Cours', subtitle: 'Créez et suivez vos cours.', listLabel: 'Mes cours' },
  podcasts: { noun: 'Podcast', title: 'Podcasts', subtitle: 'Créez et suivez vos podcasts.', listLabel: 'Mes podcasts' },
};

const fieldLabel: React.CSSProperties = { fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' };
const fieldInput: React.CSSProperties = { width: '100%', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' };

// ── Onglet « Créer / Modifier » : éditeur générique + champs spécifiques (Cours/Podcast) ──
function CreateContentTab({ kind, editing, onDone }: { kind: WorkspaceKind; editing: ContentDetail | null; onDone: () => void }) {
  const meta = KIND_META[kind];
  const [trainerName, setTrainerName] = useState(editing?.trainerName ?? '');
  const [duration, setDuration] = useState(editing?.duration ?? '');
  const [level, setLevel] = useState(editing?.level ?? 'beginner');
  // Toujours appelé (règle des hooks) même pour les cours, où il n'est simplement pas utilisé.
  const transcriptEditor = useRichTextEditor({ content: editing?.transcript ?? '', placeholder: "Transcrivez l'épisode…" });

  const config: ContentTypeConfig = {
    noun: meta.noun,
    createPath: editing ? `/api/education/${kind}/${editing.id}` : `/api/education/${kind}`,
    method: editing ? 'PUT' : 'POST',
    coverPath: (id) => `/api/education/${kind}/${id}/cover`,
    audioPath: kind === 'podcasts' ? (id) => `/api/education/${kind}/${id}/audio` : undefined,
    extraFields: kind === 'courses' ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={fieldLabel}>Formateur</label>
          <input style={fieldInput} value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="Nom du formateur" />
        </div>
        <div>
          <label style={fieldLabel}>Durée (minutes)</label>
          <input style={fieldInput} type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="ex. 90" />
        </div>
        <div>
          <label style={fieldLabel}>Niveau</label>
          <Select
            value={level}
            onChange={setLevel}
            options={[
              { value: 'beginner', label: 'Débutant' },
              { value: 'intermediate', label: 'Intermédiaire' },
              { value: 'advanced', label: 'Avancé' },
            ]}
          />
        </div>
      </div>
    ) : (
      <RichTextField editor={transcriptEditor} label="Transcription" />
    ),
    buildExtraBody: (): ExtraBodyResult => {
      if (kind === 'courses') {
        if (!trainerName.trim()) return { ok: false, error: 'Le formateur est requis.' };
        if (!duration.trim()) return { ok: false, error: 'La durée est requise.' };
        return { ok: true, body: { trainerName: trainerName.trim(), duration: duration.trim(), level } };
      }
      const transcriptText = transcriptEditor?.getText() ?? '';
      if (!transcriptText.trim()) return { ok: false, error: 'La transcription est requise.' };
      return { ok: true, body: { transcript: transcriptEditor?.getHTML() ?? '' } };
    },
    resetExtra: () => { setTrainerName(''); setDuration(''); setLevel('beginner'); transcriptEditor?.commands.clearContent(); },
    draftKey: kind,
    getDraftExtra: () => kind === 'courses' ? { trainerName, duration, level } : { transcriptHtml: transcriptEditor?.getHTML() ?? '' },
  };

  const onDraftRestored = (extra: Record<string, unknown>) => {
    if (kind === 'courses') {
      if (typeof extra.trainerName === 'string') setTrainerName(extra.trainerName);
      if (typeof extra.duration === 'string') setDuration(extra.duration);
      if (typeof extra.level === 'string') setLevel(extra.level);
    } else if (typeof extra.transcriptHtml === 'string' && extra.transcriptHtml) {
      transcriptEditor?.commands.setContent(extra.transcriptHtml);
    }
  };

  const initial: InitialContent | undefined = editing
    ? {
        title: editing.title,
        description: editing.description ?? '',
        domain: editing.domain ?? 'NONE',
        customDomain: editing.customDomain ?? '',
        categories: editing.categories ?? [],
        freeCategories: editing.freeCategories ?? [],
        tags: editing.tags ?? [],
        freeTags: editing.freeTags ?? [],
        coverUrl: `/api/education/${kind}/${editing.id}/cover`,
        audioUrl: kind === 'podcasts' ? `/api/education/${kind}/${editing.id}/audio` : undefined,
      }
    : undefined;

  return (
    <div>
      {editing && (
        <div style={{ maxWidth: '760px', margin: '0 auto 14px', fontSize: '13px', color: 'var(--gray-500, #6b7280)' }}>
          Modification de « {editing.title} » — <button type="button" onClick={onDone} style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>annuler</button>
        </div>
      )}
      <ContentEditor config={config} initial={initial} onCreated={onDone} onDraftRestored={onDraftRestored} />
    </div>
  );
}

// ── Onglet « Mes … » ───────────────────────────────────────────────────────────
function MyContent({ kind, onEdit }: { kind: WorkspaceKind; onEdit: (item: ContentDetail) => void }) {
  const meta = KIND_META[kind];
  const router = useAppRouter();
  const [filter, setFilter] = useState<'DRAFT' | 'SUBMITTED' | 'PUBLISHED'>('DRAFT');
  const [list, setList] = useState<ContentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BlogPreviewData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setList(null);
      setError(null);
      try {
        const data = await apiFetch<ContentItem[]>(`/api/education/${kind}?status=${filter}`);
        if (!cancelled) setList(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [kind, filter, reload]);

  const openPreview = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await apiFetch<ContentDetail>(`/api/education/${kind}/${id}`);
      setPreview(kind === 'podcasts' ? { ...detail, content: detail.transcript ?? undefined } : detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement de l'aperçu");
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await apiFetch<ContentDetail>(`/api/education/${kind}/${id}`);
      onEdit(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/api/education/${kind}/${id}/submit`, { method: 'POST' });
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la soumission');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(`Supprimer ce ${meta.noun.toLowerCase()} ? Il sera archivé et retiré de vos listes.`)) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/education/${kind}/${id}`, { method: 'DELETE' });
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la suppression');
    } finally {
      setBusyId(null);
    }
  };

  const tabBtn = (val: 'DRAFT' | 'SUBMITTED' | 'PUBLISHED', labelText: string) => (
    <button type="button" onClick={() => setFilter(val)} style={{
      padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
      border: `1px solid ${filter === val ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)'}`,
      background: filter === val ? 'var(--accent)' : '#fff',
      color: filter === val ? '#fff' : 'var(--gray-700, #374151)',
      transition: 'all .15s',
    }}>{labelText}</button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {tabBtn('DRAFT', 'Brouillons')}
        {tabBtn('SUBMITTED', 'En attente de validation')}
        {tabBtn('PUBLISHED', 'Publiés')}
      </div>

      {error && <div style={{ padding: '14px', borderRadius: '10px', background: '#FEF2F2', color: '#B91C1C', fontSize: '14px', marginBottom: '12px' }}>{error}</div>}
      {!list && !error && <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Chargement…</div>}
      {list && list.length === 0 && !error && (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Aucun {meta.noun.toLowerCase()} dans cette catégorie.</div>
      )}

      {list && list.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid var(--gray-100, #f3f4f6)', borderRadius: '14px', overflow: 'visible', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50, #f9fafb)', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Titre</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Domaine</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Créé le</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Modifié le</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderTop: '1px solid var(--gray-100, #f3f4f6)', transition: 'background .12s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50, #f9fafb)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.title}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={b.status} /></td>
                  <td style={{ padding: '12px 16px', color: 'var(--gray-500, #6b7280)' }}>{b.domain === 'NONE' ? '—' : b.domain}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--gray-500, #6b7280)' }}>{formatDateTime(b.createdAt)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--gray-500, #6b7280)' }}>{formatDateTime(b.updatedAt ?? b.createdAt)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <RowMenu disabled={busyId === b.id} items={[
                      { label: 'Prévisualiser', onClick: () => openPreview(b.id) },
                      ...(kind === 'courses' ? [{ label: 'Gérer les unités', onClick: () => router.push(`/course/${b.id}`) }] : []),
                      ...(filter === 'DRAFT' ? [
                        { label: 'Modifier', onClick: () => startEdit(b.id) },
                        { label: 'Valider', onClick: () => submit(b.id) },
                      ] : []),
                      ...(filter === 'DRAFT' || filter === 'SUBMITTED' ? [
                        { label: 'Supprimer', onClick: () => remove(b.id), danger: true },
                      ] : []),
                    ]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {preview && (
        <BlogPreviewModal
          blog={preview}
          coverPath={`/api/education/${kind}/${preview.id}/cover`}
          audioPath={kind === 'podcasts' ? `/api/education/podcasts/${preview.id}/audio` : undefined}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

export default function ContentWorkspace({ kind }: { kind: WorkspaceKind }) {
  const meta = KIND_META[kind];
  const [tab, setTab] = useState<'create' | 'list'>('create');
  const [editing, setEditing] = useState<ContentDetail | null>(null);

  // En quittant la section (navigation ailleurs dans la sidebar), si un brouillon non vide
  // traîne en cache locale ET que ses champs spécifiques requis sont renseignés, on le
  // sauvegarde réellement côté serveur avant de partir.
  useEffect(() => {
    return () => {
      const draft = loadDraft(kind);
      if (!isDraftMeaningful(draft)) return;
      const trainerName = typeof draft.extra.trainerName === 'string' ? draft.extra.trainerName.trim() : '';
      const duration = typeof draft.extra.duration === 'string' ? draft.extra.duration.trim() : '';
      const transcriptHtml = typeof draft.extra.transcriptHtml === 'string' ? draft.extra.transcriptHtml : '';
      const transcriptHasText = transcriptHtml.replace(/<[^>]*>/g, '').trim().length > 0;
      if (kind === 'courses' && (!trainerName || !duration)) return;
      if (kind === 'podcasts' && !transcriptHasText) return;

      const curatedCats = draft.selectedCats.filter((c) => c !== '__custom__');
      const curatedTags = draft.selectedTags.filter((t) => t !== '__custom__');
      fetch(`/api/education/${kind}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim() || 'Brouillon sans titre',
          description: draft.description.trim() || '—',
          domain: draft.domain,
          customDomain: draft.customDomain || undefined,
          categories: curatedCats.length ? curatedCats : ['NONE'],
          tags: curatedTags,
          freeTags: draft.freeTags,
          freeCategories: draft.freeCategories,
          ...(kind === 'courses'
            ? { trainerName, duration, level: typeof draft.extra.level === 'string' ? draft.extra.level : 'beginner' }
            : { transcript: transcriptHtml }),
        }),
      }).catch(() => {});
      clearDraft(kind);
    };
  }, [kind]);

  const tabStyle = (val: 'create' | 'list'): React.CSSProperties => ({
    padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none',
    borderBottom: tab === val ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === val ? 'var(--primary)' : 'var(--gray-500, #6b7280)',
  });

  const goToCreate = () => { setEditing(null); setTab('create'); };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>{meta.title}</h1>
      <p style={{ color: 'var(--gray-500, #6b7280)', fontSize: '14px', margin: '0 0 20px' }}>{meta.subtitle}</p>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--gray-200, #e5e7eb)', marginBottom: '24px' }}>
        <button type="button" style={tabStyle('create')} onClick={goToCreate}>{editing ? 'Modifier' : 'Créer'}</button>
        <button type="button" style={tabStyle('list')} onClick={() => setTab('list')}>{meta.listLabel}</button>
      </div>

      {tab === 'create'
        ? <CreateContentTab key={editing?.id ?? 'new'} kind={kind} editing={editing} onDone={() => { setEditing(null); setTab('list'); }} />
        : <MyContent kind={kind} onEdit={(item) => { setEditing(item); setTab('create'); }} />}
    </div>
  );
}
