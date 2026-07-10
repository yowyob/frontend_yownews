'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, BffApiError } from '@/lib/api-client';
import MultiSelect, { type Option } from './MultiSelect';
import Select from './Select';
import FreeChips from './FreeChips';
import type { ContentTypeConfig, InitialContent, Taxonomy } from './types';
import { clearDraft, isDraftMeaningful, loadDraft, saveDraft } from './draftCache';

// Option sentinelle : sélectionner « Aucun·e » révèle le champ de saisie libre.
const SENTINEL = '__custom__';

const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--gray-700, #374151)' };
const input: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--gray-200, #e5e7eb)', borderRadius: '10px', padding: '10px 13px',
  fontSize: '14px', outline: 'none', transition: 'border-color .15s, box-shadow .15s', background: '#fff',
};
const focusRing = 'var(--primary, #1F5FBF)';

function focusHandlers() {
  return {
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = focusRing;
      (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(31,95,191,.12)';
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-200, #e5e7eb)';
      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
    },
  };
}

// Regroupe des champs sous un intitulé discret — remplace l'ancien empilement plat de champs
// sans hiérarchie, pour que l'espace d'édition se lise comme un formulaire structuré.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--gray-100, #f3f4f6)', borderRadius: '14px', padding: '22px 24px' }}>
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--gray-400, #9ca3af)', margin: '0 0 18px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>{children}</div>
    </div>
  );
}

export default function ContentEditor(
  { config, initial, onCreated, onDraftRestored }: {
    config: ContentTypeConfig;
    initial?: InitialContent;
    onCreated?: () => void;
    // Appelé une fois si un brouillon local est restauré au montage, avec ses données spécifiques au type.
    onDraftRestored?: (extra: Record<string, unknown>) => void;
  },
) {
  // La cache de brouillon ne s'applique qu'à la création (pas à l'édition d'un contenu existant).
  const isNewDraftFlow = (config.method ?? 'POST') !== 'PUT';
  // En édition, la sentinelle « saisir mes … » est pré-cochée si des valeurs libres existent.
  const initCats = [...(initial?.categories ?? []), ...((initial?.freeCategories?.length ?? 0) > 0 ? [SENTINEL] : [])];
  const initTags = [...(initial?.tags ?? []), ...((initial?.freeTags?.length ?? 0) > 0 ? [SENTINEL] : [])];

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [domain, setDomain] = useState(initial?.domain ?? 'NONE');
  const [domains, setDomains] = useState<string[]>(['NONE']);
  const [customDomain, setCustomDomain] = useState(initial?.customDomain ?? '');
  const [categories, setCategories] = useState<Taxonomy[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>(initCats);
  const [freeCategories, setFreeCategories] = useState<string[]>(initial?.freeCategories ?? []);
  const [curatedTags, setCuratedTags] = useState<Taxonomy[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>(initTags);
  const [freeTags, setFreeTags] = useState<string[]>(initial?.freeTags ?? []);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.coverUrl ?? null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(initial?.audioUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      // Fetches indépendants : l'échec de l'un (ex. tags) ne doit pas priver
      // les autres (ex. domaines) de leur résultat.
      const [d, c, t] = await Promise.allSettled([
        apiFetch<string[]>('/api/education/domains'),
        apiFetch<Taxonomy[]>('/api/education/categories'),
        apiFetch<Taxonomy[]>('/api/education/tags'),
      ]);
      if (d.status === 'fulfilled' && Array.isArray(d.value) && d.value.length) setDomains(d.value);
      else if (d.status === 'rejected') console.error('Échec fetch domaines', d.reason);
      if (c.status === 'fulfilled' && Array.isArray(c.value)) setCategories(c.value);
      else if (c.status === 'rejected') console.error('Échec fetch catégories', c.reason);
      if (t.status === 'fulfilled' && Array.isArray(t.value)) setCuratedTags(t.value);
      else if (t.status === 'rejected') console.error('Échec fetch tags', t.reason);
    })();
  }, []);

  // Révoque l'URL d'aperçu au démontage / changement (pas de setState ici).
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);
  useEffect(() => () => { if (audioFile && audioPreview) URL.revokeObjectURL(audioPreview); }, [audioFile, audioPreview]);

  // Restaure un brouillon local au montage (uniquement en création, jamais en édition d'un
  // contenu existant) — évite de perdre le texte saisi en changeant d'onglet. Synchronisation
  // avec un système externe (localStorage) : un effet est le bon outil ici malgré le lint.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isNewDraftFlow) return;
    const draft = loadDraft(config.draftKey);
    if (!isDraftMeaningful(draft)) return;
    setTitle(draft.title);
    setDescription(draft.description);
    setDomain(draft.domain);
    setCustomDomain(draft.customDomain);
    setSelectedCats(draft.selectedCats);
    setFreeCategories(draft.freeCategories);
    setSelectedTags(draft.selectedTags);
    setFreeTags(draft.freeTags);
    onDraftRestored?.(draft.extra);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  // Sauvegarde locale debounced — capture aussi les champs spécifiques au type (TipTap, etc.).
  useEffect(() => {
    if (!isNewDraftFlow) return;
    const t = setTimeout(() => {
      saveDraft(config.draftKey, {
        title, description, domain, customDomain, selectedCats, freeCategories, selectedTags, freeTags,
        extra: config.getDraftExtra?.() ?? {},
        savedAt: Date.now(),
      });
    }, 600);
    return () => clearTimeout(t);
  }, [isNewDraftFlow, config, title, description, domain, customDomain, selectedCats, freeCategories, selectedTags, freeTags]);

  const pickCover = (file: File | null) => {
    setCoverPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null; });
    setCoverFile(file);
  };

  const pickAudio = (file: File | null) => {
    setAudioPreview((prev) => { if (prev && audioFile) URL.revokeObjectURL(prev); return file ? URL.createObjectURL(file) : null; });
    setAudioFile(file);
  };

  const sortedCategories = [...categories]
    .filter((c) => c.name !== 'NONE')
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const catOptions: Option[] = [
    { value: SENTINEL, label: 'Aucune — saisir mes catégories' },
    ...sortedCategories.map((c) => ({ value: c.name, label: c.name })),
  ];

  const sortedTags = [...curatedTags]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const tagOptions: Option[] = [
    { value: SENTINEL, label: 'Aucun — saisir mes tags' },
    ...sortedTags.map((t) => ({ value: t.name, label: t.name })),
  ];
  const showFreeCats = selectedCats.includes(SENTINEL);
  const showFreeTags = selectedTags.includes(SENTINEL);
  const showCustomDomain = domain === 'NONE';

  const reset = () => {
    setTitle(''); setDescription(''); setDomain('NONE'); setCustomDomain('');
    setSelectedCats([]); setFreeCategories([]); setSelectedTags([]); setFreeTags([]);
    pickCover(null);
    pickAudio(null);
    if (fileRef.current) fileRef.current.value = '';
    if (audioFileRef.current) audioFileRef.current.value = '';
  };

  const submit = useCallback(async () => {
    setMessage(null);
    if (!title.trim()) { setMessage({ kind: 'err', text: 'Le titre est requis.' }); return; }
    if (!description.trim()) { setMessage({ kind: 'err', text: 'La description est requise.' }); return; }

    const extra = config.buildExtraBody();
    if (!extra.ok) { setMessage({ kind: 'err', text: extra.error }); return; }

    const curatedCats = selectedCats.filter((v) => v !== SENTINEL);
    const curatedTagNames = selectedTags.filter((v) => v !== SENTINEL);

    const isEdit = (config.method ?? 'POST') === 'PUT';
    setSaving(true);
    try {
      const saved = await apiFetch<{ id: string }>(config.createPath, {
        method: config.method ?? 'POST',
        body: {
          title: title.trim(),
          description: description.trim(),
          domain,
          categories: curatedCats.length ? curatedCats : ['NONE'],
          tags: curatedTagNames,
          freeTags: showFreeTags ? freeTags : [],
          freeCategories: showFreeCats ? freeCategories : [],
          customDomain: showCustomDomain ? customDomain.trim() : undefined,
          ...extra.body,
        },
      });

      // Upload cover (best-effort, non bloquant) — uniquement si une nouvelle image est choisie.
      if (coverFile && config.coverPath && saved?.id) {
        try {
          const fd = new FormData();
          fd.append('cover', coverFile, coverFile.name);
          await apiFetch(config.coverPath(saved.id), { method: 'POST', body: fd, json: false });
        } catch {
          setMessage({ kind: 'warn', text: `${config.noun} enregistré, mais l'envoi de la cover a échoué.` });
          if (isNewDraftFlow) clearDraft(config.draftKey);
          config.resetExtra(); reset(); onCreated?.(); setSaving(false); return;
        }
      }

      // Upload audio (best-effort, non bloquant) — uniquement si un nouveau fichier est choisi.
      if (audioFile && config.audioPath && saved?.id) {
        try {
          const fd = new FormData();
          fd.append('audio', audioFile, audioFile.name);
          await apiFetch(config.audioPath(saved.id), { method: 'POST', body: fd, json: false });
        } catch {
          setMessage({ kind: 'warn', text: `${config.noun} enregistré, mais l'envoi de l'audio a échoué.` });
          if (isNewDraftFlow) clearDraft(config.draftKey);
          config.resetExtra(); reset(); onCreated?.(); setSaving(false); return;
        }
      }

      setMessage({
        kind: 'ok',
        text: isEdit ? `${config.noun} modifié.` : `${config.noun} créé en brouillon.`,
      });
      if (isNewDraftFlow) clearDraft(config.draftKey);
      config.resetExtra(); reset(); onCreated?.();
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof BffApiError ? e.message : 'Échec de la création' });
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, domain, customDomain, selectedCats, freeCategories, selectedTags, freeTags,
      showFreeCats, showFreeTags, showCustomDomain, coverFile, audioFile, config, onCreated]);

  const msgIcon = (kind: 'ok' | 'err' | 'warn') => {
    if (kind === 'ok') return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-6"/></svg>;
    if (kind === 'warn') return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>;
    return <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  };
  const msgStyle = (kind: 'ok' | 'err' | 'warn'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 500,
    background: kind === 'ok' ? 'rgba(34,197,94,.08)' : kind === 'warn' ? 'rgba(255,107,53,.08)' : '#FEF2F2',
    color: kind === 'ok' ? '#16A34A' : kind === 'warn' ? '#C2410C' : '#B91C1C',
  });

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {message && <div style={msgStyle(message.kind)}>{msgIcon(message.kind)}{message.text}</div>}

      {/* Titre — grand champ sans distraction, la rédaction commence ici */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={`Titre du ${config.noun}`}
        style={{
          width: '100%', border: 'none', borderBottom: '2px solid var(--gray-200, #e5e7eb)', borderRadius: 0,
          padding: '6px 2px 14px', fontFamily: 'var(--font-d)', fontSize: '26px', fontWeight: 800,
          color: 'var(--dark, #111827)', outline: 'none', background: 'transparent', transition: 'border-color .15s',
        }}
        onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--accent)'; }}
        onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--gray-200, #e5e7eb)'; }}
      />

      <Section title="Résumé & couverture">
        <div>
          <label style={label}>Description</label>
          <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Court résumé, affiché dans les cartes du fil" {...focusHandlers()} />
        </div>

        <div>
          <label style={label}>Image de couverture</label>
          <label
            htmlFor="cover-input"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: coverPreview ? '12px' : '26px 16px', cursor: 'pointer', textAlign: 'center',
              border: '2px dashed var(--gray-300, #d1d5db)', borderRadius: '12px', background: 'var(--gray-50, #f9fafb)',
              transition: 'border-color .2s, background .2s',
            }}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) pickCover(f); }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary, #1F5FBF)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300, #d1d5db)'; }}
          >
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Aperçu de la couverture" onError={() => setCoverPreview(null)} style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'cover' }} />
            ) : (
              <>
                <svg width="30" height="30" fill="none" stroke="var(--gray-400, #9ca3af)" strokeWidth="1.7" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700, #374151)' }}>
                  Cliquez ou glissez une image de couverture
                </span>
                <span style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>PNG, JPG — 10 Mo max</span>
              </>
            )}
          </label>
          <input id="cover-input" ref={fileRef} type="file" accept="image/*" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
          {coverPreview && (
            <button type="button" onClick={() => pickCover(null)} style={{
              marginTop: '8px', border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', padding: 0,
            }}>Retirer l&apos;image</button>
          )}
        </div>

        {config.audioPath && (
          <div>
            <label style={label}>Fichier audio</label>
            <label
              htmlFor="audio-input"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: audioPreview ? '14px' : '26px 16px', cursor: 'pointer', textAlign: 'center',
                border: '2px dashed var(--gray-300, #d1d5db)', borderRadius: '12px', background: 'var(--gray-50, #f9fafb)',
                transition: 'border-color .2s, background .2s',
              }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('audio/')) pickAudio(f); }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary, #1F5FBF)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-300, #d1d5db)'; }}
            >
              {audioPreview ? (
                <audio controls src={audioPreview} style={{ width: '100%' }} onClick={(e) => e.preventDefault()} />
              ) : (
                <>
                  <svg width="30" height="30" fill="none" stroke="var(--gray-400, #9ca3af)" strokeWidth="1.7" viewBox="0 0 24 24">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700, #374151)' }}>
                    Cliquez ou glissez un fichier audio
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>MP3, WAV, M4A</span>
                </>
              )}
            </label>
            <input id="audio-input" ref={audioFileRef} type="file" accept="audio/*" onChange={(e) => pickAudio(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            {audioPreview && (
              <button type="button" onClick={() => pickAudio(null)} style={{
                marginTop: '8px', border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px',
                fontWeight: 600, cursor: 'pointer', padding: 0,
              }}>Retirer l&apos;audio</button>
            )}
          </div>
        )}
      </Section>

      <Section title="Classification">
        <div>
          <label style={label}>Domaine</label>
          <Select
            value={domain}
            onChange={setDomain}
            options={domains.map((d) => ({ value: d, label: d === 'NONE' ? 'Aucun — saisir mon domaine' : d }))}
          />
          {showCustomDomain && (
            <input style={{ ...input, marginTop: '8px' }} value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="Votre domaine (ex. Cuisine)" {...focusHandlers()} />
          )}
        </div>

        <div>
          <label style={label}>Catégories</label>
          <MultiSelect options={catOptions} selected={selectedCats} setSelected={setSelectedCats} placeholder="Sélectionner des catégories…" />
          {showFreeCats && (
            <div style={{ marginTop: '8px' }}>
              <FreeChips values={freeCategories} setValues={setFreeCategories} placeholder="ajouter une catégorie puis Entrée" />
            </div>
          )}
        </div>

        <div>
          <label style={label}>Tags</label>
          <MultiSelect options={tagOptions} selected={selectedTags} setSelected={setSelectedTags} placeholder="Sélectionner des tags…" />
          {showFreeTags && (
            <div style={{ marginTop: '8px' }}>
              <FreeChips values={freeTags} setValues={setFreeTags} slugify placeholder="ajouter un tag puis Entrée" />
            </div>
          )}
        </div>
      </Section>

      {/* Corps du contenu / transcription — après les métadonnées, pour renseigner d'abord le contexte du contenu */}
      {config.extraFields}

      <div style={{ position: 'sticky', bottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" disabled={saving} onClick={submit} style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '999px',
          padding: '13px 28px', fontSize: '14px', fontFamily: 'var(--font-d)', fontWeight: 700,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.65 : 1,
          boxShadow: '0 4px 16px rgba(255,107,53,.3)', transition: 'transform .15s, box-shadow .15s',
        }}
          onMouseEnter={(e) => { if (!saving) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(255,107,53,.4)'; } }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(255,107,53,.3)'; }}
        >{saving ? 'Enregistrement…' : (config.method === 'PUT' ? 'Enregistrer les modifications' : 'Créer le brouillon')}</button>
      </div>
    </div>
  );
}
