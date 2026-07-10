'use client';
import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-client';
import RowMenu, { type MenuItem } from '@/components/education/RowMenu';
import NewsletterSubscriptions from '@/components/newsletter/NewsletterSubscriptions';
import RichTextField, { useRichTextEditor } from '@/components/content-editor/RichTextField';

type RedacteurStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type NewsletterStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type StatutNewsletter = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

type RedacteurRequest = { id: string; status: RedacteurStatus; rejectionReason?: string | null };
type Categorie = { id: string; nom: string; description?: string | null };
// Une PUBLICATION (canal) : titre + description + catégories, validée par l'admin.
type Publication = { id: string; titre: string; description?: string | null; statut: NewsletterStatus; categories?: Categorie[] | null; coverId?: string | null; createdAt?: string | null };
// Un CONTENU rattaché à une publication.
type ContentItem = { id: string; newsletterId: string; titre: string; contenu: string; statut: StatutNewsletter; coverId?: string | null; createdAt?: string | null; publishedAt?: string | null };

const PUB_STATUT_LABELS: Record<NewsletterStatus, string> = {
  PENDING: 'En attente de validation', APPROVED: 'Validée', REJECTED: 'Rejetée',
};
const CONTENT_STATUT_LABELS: Record<StatutNewsletter, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', APPROVED: 'Approuvé', REJECTED: 'Rejeté', PUBLISHED: 'Publié',
};

const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' };
const input: React.CSSProperties = { width: '100%', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', boxSizing: 'border-box' };

// ── Formulaire de demande de création de newsletter (= demande rédacteur) ──
function RequestForm({ email: initialEmail, onSubmitted }: { email: string; onSubmitted: () => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim()) { setError("L'email est requis."); return; }
    setBusy(true);
    try {
      await apiFetch('/api/newsletter/redacteurs', { method: 'POST', body: { email: email.trim() } });
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la demande');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>Demander la création de ma newsletter</h2>
        <p style={{ fontSize: '13px', color: 'var(--gray-500, #6b7280)', margin: 0 }}>
          Soumettez votre demande. Un administrateur la validera avant que vous puissiez publier.
        </p>
      </div>

      {error && <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#FEF2F2', color: '#B91C1C', fontSize: '13px' }}>{error}</div>}

      <div>
        <label style={label}>Email de la newsletter</label>
        <input style={input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" />
        <span style={{ fontSize: '11.5px', color: 'var(--gray-400, #9ca3af)' }}>Peut différer de l&apos;email de votre compte.</span>
      </div>

      <button type="button" onClick={submit} disabled={busy} style={{
        alignSelf: 'flex-start', border: 'none', borderRadius: '8px', padding: '10px 22px', background: 'var(--accent)',
        color: '#fff', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
      }}>
        {busy ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </div>
  );
}

const statutBadge = (bg: string, color: string): React.CSSProperties => ({
  fontSize: '12px', color, background: bg, borderRadius: '20px', padding: '2px 10px', fontWeight: 600, whiteSpace: 'nowrap',
});
function PubStatutBadge({ statut }: { statut: NewsletterStatus }) {
  const map: Record<NewsletterStatus, React.CSSProperties> = {
    PENDING: statutBadge('rgba(245,158,11,.12)', '#B45309'),
    APPROVED: statutBadge('rgba(16,185,129,.12)', '#059669'),
    REJECTED: statutBadge('#FEF2F2', '#B91C1C'),
  };
  return <span style={map[statut]}>{PUB_STATUT_LABELS[statut]}</span>;
}
function ContentStatutBadge({ statut }: { statut: StatutNewsletter }) {
  const map: Record<StatutNewsletter, React.CSSProperties> = {
    DRAFT: statutBadge('var(--gray-100, #f3f4f6)', '#6b7280'),
    SUBMITTED: statutBadge('rgba(37,99,235,.1)', '#1d4ed8'),
    APPROVED: statutBadge('rgba(16,185,129,.12)', '#059669'),
    REJECTED: statutBadge('#FEF2F2', '#B91C1C'),
    PUBLISHED: statutBadge('rgba(16,185,129,.16)', '#047857'),
  };
  return <span style={map[statut]}>{CONTENT_STATUT_LABELS[statut]}</span>;
}

// ── Formulaire de création / modification d'une PUBLICATION (titre + description + catégories) ──
function CreatePublicationForm({ editing, onCreated }: { editing?: Publication | null; onCreated: () => void }) {
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [titre, setTitre] = useState(editing?.titre ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [selectedCats, setSelectedCats] = useState<string[]>((editing?.categories ?? []).map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    apiFetch<Categorie[]>('/api/newsletter/categories').then(setCategories).catch(() => {});
  }, []);

  const submit = async () => {
    setMessage(null);
    if (!titre.trim()) { setMessage({ kind: 'err', text: 'Le titre est requis.' }); return; }
    setBusy(true);
    try {
      const body = { titre: titre.trim(), description: description.trim(), categorieIds: selectedCats };
      if (editing) {
        await apiFetch(`/api/newsletter/newsletters/${editing.id}`, { method: 'PUT', body });
      } else {
        await apiFetch('/api/newsletter/newsletters', { method: 'POST', body });
      }
      onCreated();
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec de l’enregistrement' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>{editing ? 'Modifier la newsletter' : 'Créer une newsletter'}</h2>
        <p style={{ fontSize: '13.5px', color: 'var(--gray-600, #4b5563)', margin: 0, lineHeight: 1.5 }}>
          Définissez le titre, la description et les catégories de votre newsletter. Un administrateur devra la valider avant que vous puissiez y rédiger du contenu.
        </p>
      </div>
      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}
      <div>
        <label style={label}>Titre</label>
        <input style={input} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de la newsletter" />
      </div>
      <div>
        <label style={label}>Description <span style={{ fontWeight: 400, color: 'var(--gray-400, #9ca3af)' }}>(facultatif)</span></label>
        <textarea style={{ ...input, minHeight: '90px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="À propos de cette newsletter…" />
      </div>
      <div>
        <label style={label}>Catégories <span style={{ fontWeight: 400, color: 'var(--gray-400, #9ca3af)' }}>(facultatif)</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setSelectedCats((prev) => prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id])} style={{
              border: '1px solid', borderColor: selectedCats.includes(c.id) ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)',
              background: selectedCats.includes(c.id) ? 'rgba(239,68,68,.08)' : '#fff',
              color: selectedCats.includes(c.id) ? 'var(--accent)' : 'var(--gray-700, #374151)',
              borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>{c.nom}</button>
          ))}
        </div>
      </div>
      <button type="button" onClick={submit} disabled={busy} style={{
        alignSelf: 'flex-start', border: 'none', borderRadius: '8px', padding: '10px 22px', background: 'var(--accent)',
        color: '#fff', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
      }}>{busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer la newsletter'}</button>
    </div>
  );
}

// ── Espace de rédaction des CONTENUS d'une publication validée ──
function ContentSpace({ publication, onBack }: { publication: Publication; onBack: () => void }) {
  const [contents, setContents] = useState<ContentItem[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [titre, setTitre] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const editor = useRichTextEditor({ placeholder: 'Rédigez le contenu…' });

  const load = async () => {
    try { setContents(await apiFetch<ContentItem[]>(`/api/newsletter/newsletters/${publication.id}/contents`)); }
    catch { setContents([]); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` réutilisé après création/soumission.
  useEffect(() => { load(); }, [publication.id]);
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  const pickCover = (f: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(f);
    setCoverPreview(f ? URL.createObjectURL(f) : null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    setMessage(null);
    const contenu = editor?.getHTML() ?? '';
    if (!titre.trim() || !(editor?.getText().trim())) {
      setMessage({ kind: 'err', text: 'Titre et contenu sont requis.' });
      return;
    }
    setBusy(true);
    try {
      const created = await apiFetch<{ id: string }>(`/api/newsletter/newsletters/${publication.id}/contents`, {
        method: 'POST',
        body: { titre: titre.trim(), contenu },
      });
      if (coverFile && created?.id) {
        try {
          const fd = new FormData();
          fd.append('cover', coverFile, coverFile.name);
          await apiFetch(`/api/newsletter/contents/${created.id}/cover`, { method: 'POST', body: fd, json: false });
        } catch { /* image facultative */ }
      }
      setTitre(''); editor?.commands.clearContent(); pickCover(null); setShowForm(false);
      setMessage({ kind: 'ok', text: 'Contenu créé en brouillon.' });
      load();
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec de la création' });
    } finally {
      setBusy(false);
    }
  };

  const publishContent = async (id: string) => {
    setConfirmPublishId(null);
    setMessage(null);
    setContents((prev) => prev ? prev.map((c) => c.id === id ? { ...c, statut: 'PUBLISHED' } : c) : prev);
    try {
      await apiFetch(`/api/newsletter/contents/${id}/publish`, { method: 'POST' });
      setMessage({ kind: 'ok', text: 'Contenu publié — envoi aux abonnés en cours.' });
    } catch (e) {
      setMessage({ kind: 'err', text: e instanceof Error ? e.message : 'Échec de la publication' });
      load();
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      <button type="button" onClick={onBack} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
         Mes newsletters
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, margin: 0 }}>{publication.titre}</h2>
        <PubStatutBadge statut={publication.statut} />
      </div>
      {publication.description && <p style={{ fontSize: '13.5px', color: 'var(--gray-600, #4b5563)', margin: '0 0 6px' }}>{publication.description}</p>}
      {publication.categories && publication.categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
          {publication.categories.map((c) => (
            <span key={c.id} style={{ fontSize: '12px', color: 'var(--gray-600, #4b5563)', background: 'var(--gray-100, #f3f4f6)', borderRadius: '20px', padding: '2px 10px' }}>{c.nom}</span>
          ))}
        </div>
      )}

      {message && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', background: message.kind === 'ok' ? 'rgba(16,185,129,.1)' : '#FEF2F2', color: message.kind === 'ok' ? '#059669' : '#B91C1C' }}>{message.text}</div>
      )}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)} style={{
          border: 'none', borderRadius: '8px', padding: '10px 22px', background: 'var(--accent)',
          color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginBottom: '20px',
        }}>+ Nouveau contenu</button>
      )}

      {showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px', padding: '18px', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '12px' }}>
          <div>
            <label style={label}>Titre</label>
            <input style={input} value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du contenu" />
          </div>
          <div>
            <label style={label}>Image de couverture</label>
            <label
              htmlFor="content-cover-input"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '8px', padding: coverPreview ? '12px' : '26px 16px', cursor: 'pointer', textAlign: 'center',
                border: '2px dashed var(--gray-300, #d1d5db)', borderRadius: '12px', background: 'var(--gray-50, #f9fafb)',
              }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) pickCover(f); }}
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Aperçu de la couverture" style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'cover' }} />
              ) : (
                <>
                  <svg width="28" height="28" fill="none" stroke="var(--gray-400, #9ca3af)" strokeWidth="1.7" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--gray-700, #374151)' }}>Cliquez ou glissez une image de couverture</span>
                  <span style={{ fontSize: '12px', color: 'var(--gray-400, #9ca3af)' }}>PNG, JPG — facultatif</span>
                </>
              )}
            </label>
            <input id="content-cover-input" ref={fileRef} type="file" accept="image/*" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
            {coverPreview && (
              <button type="button" onClick={() => pickCover(null)} style={{ marginTop: '8px', border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Retirer l&apos;image
              </button>
            )}
          </div>
          <RichTextField editor={editor} label="Contenu" />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={submit} disabled={busy} style={{
              border: 'none', borderRadius: '8px', padding: '10px 22px', background: 'var(--accent)',
              color: '#fff', fontWeight: 700, fontSize: '14px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
            }}>{busy ? 'Création…' : 'Créer en brouillon'}</button>
            <button type="button" onClick={() => { setShowForm(false); setTitre(''); editor?.commands.clearContent(); pickCover(null); }} style={{
              border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '10px 18px', background: '#fff',
              color: 'var(--gray-700, #374151)', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contents === null && <div style={{ color: 'var(--gray-400, #9ca3af)', fontSize: '14px' }}>Chargement…</div>}
        {contents && contents.length === 0 && <div style={{ color: 'var(--gray-500, #6b7280)', fontSize: '14px' }}>Aucun contenu pour l&apos;instant.</div>}
        {contents && contents.map((c) => (
          <div key={c.id} style={{ border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {c.coverId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/newsletter/contents/${c.id}/cover`} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.titre}</div>
              <div style={{ marginTop: '4px' }}><ContentStatutBadge statut={c.statut} /></div>
            </div>
            {c.statut !== 'PUBLISHED' && (
              <button type="button" onClick={() => setConfirmPublishId(c.id)} style={{ border: 'none', borderRadius: '8px', padding: '7px 14px', background: 'var(--accent)', color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}>
                Publier
              </button>
            )}
          </div>
        ))}
      </div>

      {confirmPublishId && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setConfirmPublishId(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '14px', padding: '24px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 45px rgba(0,0,0,.18)' }}>
            <h3 style={{ fontFamily: 'var(--font-d)', fontSize: '17px', fontWeight: 800, margin: '0 0 10px' }}>Publier ce contenu ?</h3>
            <p style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--gray-600, #4b5563)', margin: '0 0 20px' }}>
              Il sera envoyé par email aux abonnés de la newsletter (abonnés des catégories et lecteurs qui vous suivent).
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setConfirmPublishId(null)} style={{
                border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '9px 18px', background: '#fff',
                color: 'var(--gray-700, #374151)', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer',
              }}>Annuler</button>
              <button type="button" onClick={() => publishContent(confirmPublishId)} style={{
                border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)',
                color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer',
              }}>Publier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Espace du rédacteur approuvé : liste des publications + ouverture d'une publication ──
function PublicationsWorkspace() {
  const [publications, setPublications] = useState<Publication[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);
  const [selected, setSelected] = useState<Publication | null>(null);

  const load = async () => {
    try { setPublications(await apiFetch<Publication[]>('/api/newsletter/newsletters/mine')); }
    catch { setPublications([]); }
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` réutilisé après création.
  useEffect(() => { load(); }, []);

  if (selected) {
    return <ContentSpace publication={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  if (publications === null) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400, #9ca3af)' }}>Chargement…</div>;
  }

  if (editing) {
    return (
      <div>
        <button type="button" onClick={() => setEditing(null)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
           Mes newsletters
        </button>
        <CreatePublicationForm editing={editing} onCreated={() => { setEditing(null); load(); }} />
      </div>
    );
  }

  if (creating || publications.length === 0) {
    return (
      <div>
        {publications.length > 0 && (
          <button type="button" onClick={() => setCreating(false)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
             Mes newsletters
          </button>
        )}
        <CreatePublicationForm onCreated={() => { setCreating(false); load(); }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: '20px', fontWeight: 800, margin: 0 }}>Mes newsletters</h2>
        <button type="button" onClick={() => setCreating(true)} style={{ border: 'none', borderRadius: '8px', padding: '9px 18px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}>
          + Nouvelle newsletter
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {publications.map((p) => {
          const clickable = p.statut === 'APPROVED';
          return (
            <div
              key={p.id}
              onClick={clickable ? () => setSelected(p) : undefined}
              style={{
                border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: clickable ? 'pointer' : 'default',
              }}
            >
              {p.coverId && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/newsletter/newsletters/${p.id}/cover`} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{p.titre}</div>
                {p.description && <div style={{ fontSize: '12.5px', color: 'var(--gray-500, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
              </div>
              <PubStatutBadge statut={p.statut} />
              <div onClick={(e) => e.stopPropagation()}>
                <RowMenu items={([
                  clickable ? { label: 'Ouvrir', onClick: () => setSelected(p) } : null,
                  { label: 'Modifier', onClick: () => setEditing(p) },
                ].filter(Boolean)) as MenuItem[]} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RedacteurSpace({ email }: { email: string }) {
  const [request, setRequest] = useState<RedacteurRequest | null | undefined>(undefined);

  const load = async () => {
    setRequest(undefined);
    try { setRequest(await apiFetch<RedacteurRequest | null>('/api/newsletter/redacteurs/me')); } catch { setRequest(null); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- `load` est repassé en callback à RequestForm.
  useEffect(() => { load(); }, []);

  if (request === undefined) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gray-400, #9ca3af)' }}>Chargement…</div>;
  }

  if (!request) {
    return <RequestForm email={email} onSubmitted={load} />;
  }

  if (request.status === 'PENDING') {
    return (
      <div style={{ maxWidth: '480px', padding: '20px', borderRadius: '12px', background: 'rgba(245,158,11,.1)', color: '#B45309' }}>
        <strong>Demande en attente.</strong> Un administrateur doit valider votre demande de création de newsletter avant que vous puissiez rédiger du contenu.
      </div>
    );
  }

  if (request.status === 'REJECTED') {
    return (
      <div style={{ maxWidth: '480px', padding: '20px', borderRadius: '12px', background: '#FEF2F2', color: '#B91C1C' }}>
        <strong>Demande rejetée.</strong>
        {request.rejectionReason && <p style={{ margin: '8px 0 0', fontSize: '13px' }}>{request.rejectionReason}</p>}
      </div>
    );
  }

  return <PublicationsWorkspace />;
}

type WorkspaceTab = 'redaction' | 'abonnements';

const TABS: { key: WorkspaceTab; label: string }[] = [
  { key: 'redaction', label: 'Créer / gérer mes newsletters' },
  { key: 'abonnements', label: 'Mes abonnements' },
];

export default function NewsletterWorkspace({ email }: { email: string }) {
  const [tab, setTab] = useState<WorkspaceTab>('redaction');

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 20,
            border: `1px solid ${tab === t.key ? 'var(--accent)' : 'var(--gray-200)'}`,
            background: tab === t.key ? 'var(--accent)' : '#fff',
            color: tab === t.key ? '#fff' : 'var(--gray-600)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'redaction' ? <RedacteurSpace email={email} /> : <NewsletterSubscriptions email={email} />}
    </div>
  );
}
