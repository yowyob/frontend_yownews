'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import ContentEditor from '@/components/content-editor/ContentEditor';
import BlockEditor from '@/components/block-editor/BlockEditor';
import type { ContentTypeConfig, ExtraBodyResult, InitialContent } from '@/components/content-editor/types';
import { clearDraft, isDraftMeaningful, loadDraft } from '@/components/content-editor/draftCache';
import StatusBadge from '@/components/education/StatusBadge';
import RowMenu from '@/components/education/RowMenu';
import BlogPreviewModal from '@/components/education/BlogPreviewModal';
import ModerationLink from '@/components/education/ModerationLink';

const DRAFT_KIND = 'blog';

type Blog = {
  id: string;
  title: string;
  domain?: string | null;
  status?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

type BlogDetail = Blog & {
  description?: string | null;
  content?: string | null;
  rawContent?: string | null;
  customDomain?: string | null;
  freeTags?: string[] | null;
  freeCategories?: string[] | null;
  categories?: string[] | null;
  tags?: string[] | null;
};

const WORDS_PER_MIN = 200;

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

function formatDateTime(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateTimeFormatter.format(d);
}

// ── Onglet « Créer / Modifier » : métadonnées (étape 1) puis éditeur par blocs (étape 2) ───────
function CreateBlogTab({ editing, onDone }: { editing: BlogDetail | null; onDone: () => void }) {
  // Corps = HTML sérialisé par l'éditeur par blocs. Le `key` sur ce composant (cf. BlogWorkspace)
  // garantit un remontage par cible d'édition, donc `value` initial correct.
  const [contenu, setContenu] = useState(editing?.content ?? '');
  // Remontage du BlockEditor uniquement quand on injecte un nouveau HTML de départ (brouillon
  // restauré) — pas à chaque frappe (l'éditeur ne relit `value` qu'au montage).
  const [remountKey, setRemountKey] = useState(0);

  const config: ContentTypeConfig = {
    noun: 'Blog',
    createPath: editing ? `/api/education/blogs/${editing.id}` : '/api/education/blogs',
    method: editing ? 'PUT' : 'POST',
    coverPath: (id) => `/api/education/blogs/${id}/cover`,
    twoStep: true,
    // Alimente l'aperçu live avec le HTML sérialisé de l'éditeur par blocs (mis à jour à chaque frappe).
    liveBodyHtml: contenu,
    extraFields: (
      <BlockEditor key={remountKey} value={contenu} onChange={setContenu} mode="education" uploadEndpoint="/api/education/media" />
    ),
    buildExtraBody: (): ExtraBodyResult => {
      const text = contenu.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const hasMedia = /<(img|a)\b/i.test(contenu);
      if (!text && !hasMedia) return { ok: false, error: 'Le contenu est requis.' };
      const readingTime = Math.max(1, Math.round((text ? text.split(/\s+/).length : 0) / WORDS_PER_MIN));
      return { ok: true, body: { content: contenu, rawContent: '', readingTime } };
    },
    resetExtra: () => setContenu(''),
    draftKey: DRAFT_KIND,
    getDraftExtra: () => ({ contentHtml: contenu }),
  };

  const onDraftRestored = (extra: Record<string, unknown>) => {
    if (typeof extra.contentHtml === 'string' && extra.contentHtml) {
      setContenu(extra.contentHtml);
      setRemountKey((k) => k + 1); // force le BlockEditor à repartir du HTML restauré
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
        coverUrl: `/api/education/blogs/${editing.id}/cover`,
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

// ── Onglet « Mes blogs » ──────────────────────────────────────────────────────
function MyBlogs({ onEdit }: { onEdit: (blog: BlogDetail) => void }) {
  const [filter, setFilter] = useState<'DRAFT' | 'SUBMITTED' | 'PUBLISHED'>('DRAFT');
  const [blogs, setBlogs] = useState<Blog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BlogDetail | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBlogs(null);
      setError(null);
      try {
        const data = await apiFetch<Blog[]>(`/api/education/blogs?status=${filter}`);
        if (!cancelled) setBlogs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [filter, reload]);

  const openPreview = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await apiFetch<BlogDetail>(`/api/education/blogs/${id}`);
      setPreview(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement de l\'aperçu');
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = async (id: string) => {
    setBusyId(id);
    try {
      const detail = await apiFetch<BlogDetail>(`/api/education/blogs/${id}`);
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
      await apiFetch(`/api/education/blogs/${id}/submit`, { method: 'POST' });
      setReload((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la soumission');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Supprimer ce blog ? Il sera archivé et retiré de vos listes.')) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/education/blogs/${id}`, { method: 'DELETE' });
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
      {!blogs && !error && <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Chargement…</div>}
      {blogs && blogs.length === 0 && !error && (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--gray-500, #6b7280)' }}>Aucun blog dans cette catégorie.</div>
      )}

      {blogs && blogs.length > 0 && (
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
              {blogs.map((b) => (
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

      {preview && <BlogPreviewModal blog={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

export default function BlogWorkspace() {
  const [tab, setTab] = useState<'create' | 'list'>('create');
  const [editing, setEditing] = useState<BlogDetail | null>(null);

  // En quittant la section Blog (navigation ailleurs dans la sidebar), si un brouillon non
  // vide traîne en cache locale, on le sauvegarde réellement côté serveur avant de partir.
  useEffect(() => {
    return () => {
      const draft = loadDraft(DRAFT_KIND);
      if (!isDraftMeaningful(draft)) return;
      const curatedCats = draft.selectedCats.filter((c) => c !== '__custom__');
      const curatedTags = draft.selectedTags.filter((t) => t !== '__custom__');
      const contentHtml = typeof draft.extra.contentHtml === 'string' && draft.extra.contentHtml ? draft.extra.contentHtml : '<p></p>';
      fetch('/api/education/blogs', {
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
          content: contentHtml,
          readingTime: 1,
        }),
      }).catch(() => {});
      clearDraft(DRAFT_KIND);
    };
  }, []);

  const tabStyle = (val: 'create' | 'list'): React.CSSProperties => ({
    padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none',
    borderBottom: tab === val ? '2px solid var(--accent)' : '2px solid transparent',
    color: tab === val ? 'var(--primary)' : 'var(--gray-500, #6b7280)',
  });

  const goToCreate = () => { setEditing(null); setTab('create'); };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-d)', fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>Blog</h1>
      <p style={{ color: 'var(--gray-500, #6b7280)', fontSize: '14px', margin: '0 0 20px' }}>Rédigez et suivez vos articles.</p>

      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--gray-200, #e5e7eb)', marginBottom: '24px' }}>
        <button type="button" style={tabStyle('create')} onClick={goToCreate}>{editing ? 'Modifier' : 'Créer'}</button>
        <button type="button" style={tabStyle('list')} onClick={() => setTab('list')}>Mes blogs</button>
        <ModerationLink kind="blogs" />
      </div>

      {tab === 'create'
        ? <CreateBlogTab key={editing?.id ?? 'new'} editing={editing} onDone={() => { setEditing(null); setTab('list'); }} />
        : <MyBlogs onEdit={(blog) => { setEditing(blog); setTab('create'); }} />}
    </div>
  );
}
