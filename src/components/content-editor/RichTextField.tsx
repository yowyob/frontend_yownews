'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { DragHandle } from '@tiptap/extension-drag-handle-react';

/**
 * Éditeur riche TipTap partagé par tous les types de contenu (blog, transcription de
 * podcast, unités de cours…) — un seul socle pour que l'expérience de rédaction reste
 * cohérente, chaque espace d'édition ne fournissant que son placeholder/contenu initial.
 *
 * Deux capacités notables :
 * - **blocs déplaçables** : une poignée apparaît au survol de chaque bloc (paragraphe, titre,
 *   image…) et permet de le glisser ailleurs dans le document ;
 * - **images multiples dans le corps** : on peut déposer ou coller des images directement dans le
 *   texte. Chacune est téléversée immédiatement et seule son **URL** est écrite dans le HTML —
 *   jamais les octets (un data-URI en base64 alourdirait le contenu de ~33 % et empêcherait toute
 *   mise en cache par le navigateur).
 */

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif'];

// L'upload est déclenché depuis les extensions (dépôt/collage), c'est-à-dire hors du composant
// React. Plutôt que de changer la signature de `useRichTextEditor` — utilisée par plusieurs
// espaces d'édition qui la traitent comme un simple `Editor` —, on signale l'état d'envoi par un
// évènement DOM sur l'éditeur, que `RichTextField` écoute.
const MEDIA_EVENT = 'yownews:media-upload';
type MediaEventDetail = { pending: boolean; error?: string };

function emitMediaState(editor: Editor, detail: MediaEventDetail) {
  editor.view.dom.dispatchEvent(new CustomEvent<MediaEventDetail>(MEDIA_EVENT, { detail }));
}

/**
 * Téléverse une image et renvoie l'URL **relative** à insérer dans le HTML. On garde une URL
 * relative (et non absolue) pour que le contenu reste portable si le domaine change ; les
 * endpoints de diffusion externe la réécriront en absolu au moment de servir.
 */
async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file, file.name);
  const res = await fetch('/api/education/media', { method: 'POST', body });
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error?.message ?? "L'envoi de l'image a échoué.");
  }
  const id = payload?.data?.id ?? payload?.id;
  if (!id) throw new Error("Réponse inattendue du serveur lors de l'envoi de l'image.");
  return `/api/education/media/${id}`;
}

/** Téléverse puis insère l'image à `pos` (ou au curseur si `pos` est omis). */
async function uploadAndInsert(editor: Editor, file: File, pos?: number) {
  emitMediaState(editor, { pending: true });
  try {
    const src = await uploadImage(file);
    const chain = editor.chain().focus();
    if (typeof pos === 'number') {
      chain.insertContentAt(pos, { type: 'image', attrs: { src, alt: file.name } });
    } else {
      chain.setImage({ src, alt: file.name });
    }
    chain.run();
    emitMediaState(editor, { pending: false });
  } catch (cause) {
    emitMediaState(editor, {
      pending: false,
      error: cause instanceof Error ? cause.message : "L'envoi de l'image a échoué.",
    });
  }
}

/**
 * `rich` (défaut true) active les images en ligne (dépôt/collage → upload) et, côté composant, la
 * poignée de déplacement des blocs. Le passer à `false` donne un éditeur de texte simple, sans média
 * en ligne ni drag-and-drop — voulu par exemple pour la newsletter, qui n'inclut qu'une **seule**
 * ressource (image ou PDF) gérée séparément, pas des images multiples dans le corps.
 */
export function useRichTextEditor({
  content,
  placeholder,
  rich = true,
}: { content?: string; placeholder?: string; rich?: boolean }) {
  return useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Rédigez ici…' }),
      ...(rich
        ? [
            Image.configure({ inline: false, allowBase64: false }),
            FileHandler.configure({
              allowedMimeTypes: ACCEPTED_IMAGE_TYPES,
              // Dépôt : on insère à l'endroit exact du lâcher, pas au curseur.
              onDrop: (currentEditor, files, pos) => {
                files.forEach((file) => void uploadAndInsert(currentEditor, file, pos));
              },
              onPaste: (currentEditor, files) => {
                files.forEach((file) => void uploadAndInsert(currentEditor, file));
              },
            }),
          ]
        : []),
    ],
    content: content ?? '',
    immediatelyRender: false,
  });
}

// Bouton de la barre d'outils : icône + libellé en clair + info-bulle native (`title`).
// Remplace l'ancien "H2"/"H3" (jargon technique incompréhensible pour un rédacteur non
// technique) par des mots simples ("Titre", "Sous-titre") dont la taille du libellé reflète
// elle-même la taille du texte produit — la fonction se lit d'un coup d'œil.
function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--gray-200, #e5e7eb)'}`, borderRadius: '7px', padding: '6px 10px',
        fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', background: active ? 'var(--accent)' : '#fff',
        color: active ? '#fff' : 'var(--gray-700, #374151)', transition: 'all .12s', whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--gray-200, #e5e7eb)', margin: '2px 2px' }} />;
}

function Toolbar({ editor, rich }: { editor: Editor | null; rich: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!editor) return null;
  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Adresse du lien (ex. https://exemple.com)', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', padding: '8px', borderBottom: '1px solid var(--gray-200, #e5e7eb)' }}>
      <ToolBtn title="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b style={{ fontSize: '14px' }}>B</b>
      </ToolBtn>
      <ToolBtn title="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i style={{ fontSize: '14px' }}>I</i>
      </ToolBtn>
      <ToolBtn title="Texte barré" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </ToolBtn>

      <Divider />

      {/* La taille du libellé donne à voir directement le résultat — plus besoin de deviner ce qu'est "H2". */}
      <ToolBtn title="Titre de section (grand)" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span style={{ fontWeight: 800, fontSize: '15px' }}>Titre</span>
      </ToolBtn>
      <ToolBtn title="Sous-titre (plus petit)" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span style={{ fontWeight: 700, fontSize: '12px' }}>Sous-titre</span>
      </ToolBtn>

      <Divider />

      <ToolBtn title="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none"/></svg>
        Liste
      </ToolBtn>
      <ToolBtn title="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        Numéros
      </ToolBtn>
      <ToolBtn title="Mettre en citation" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15c2.5 0 4-2 4-4.5C11 7.5 9 6 6.5 6S2 8 2 10.5c0 3 2 6 6 7.5l1-1.5C6.5 15.7 5.5 15 7 15zm10 0c2.5 0 4-2 4-4.5C21 7.5 19 6 16.5 6S12 8 12 10.5c0 3 2 6 6 7.5l1-1.5c-2.5-.8-3.5-1.5-2-1.5z"/></svg>
        Citation
      </ToolBtn>
      <ToolBtn title="Extrait de code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        Code
      </ToolBtn>

      <Divider />

      {/* Bouton image : seulement en mode riche. Alternative accessible au glisser-déposer — tout
          le monde ne pense pas à faire glisser un fichier dans le texte. */}
      {rich && (
        <>
          <ToolBtn title="Insérer une image dans le texte" active={editor.isActive('image')} onClick={() => fileInputRef.current?.click()}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
            Image
          </ToolBtn>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              files.forEach((file) => void uploadAndInsert(editor, file));
              e.target.value = ''; // permet de re-sélectionner le même fichier
            }}
          />
        </>
      )}
      <ToolBtn title="Insérer un lien" active={editor.isActive('link')} onClick={setLink}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        Lien
      </ToolBtn>
      <ToolBtn title="Ligne de séparation" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"/></svg>
        Séparateur
      </ToolBtn>

      <Divider />

      <ToolBtn title="Annuler" active={false} onClick={() => editor.chain().focus().undo().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-15-6.7L3 13"/></svg>
      </ToolBtn>
      <ToolBtn title="Rétablir" active={false} onClick={() => editor.chain().focus().redo().run()}>
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0115-6.7L21 13"/></svg>
      </ToolBtn>
    </div>
  );
}

export default function RichTextField({ editor, label = 'Contenu', minHeight = 220, rich = true }: { editor: Editor | null; label?: string; minHeight?: number; rich?: boolean }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // État d'envoi remonté par les extensions (dépôt/collage) comme par le bouton de la barre.
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onMedia = (event: Event) => {
      const detail = (event as CustomEvent<MediaEventDetail>).detail;
      setUploading(detail.pending);
      setUploadError(detail.error ?? null);
    };
    dom.addEventListener(MEDIA_EVENT, onMedia);
    return () => dom.removeEventListener(MEDIA_EVENT, onMedia);
  }, [editor]);

  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--gray-700, #374151)' }}>{label}</label>
      <div className="rtf-shell" style={{ border: '1.5px solid var(--gray-200, #e5e7eb)', borderRadius: '12px', overflow: 'hidden', background: '#fff', transition: 'border-color .15s, box-shadow .15s' }}>
        <Toolbar editor={editor} rich={rich} />
        <div style={{ padding: '14px 16px', minHeight, position: 'relative' }}>
          {/* Poignée de déplacement : seulement en mode riche. Suit le bloc survolé. */}
          {editor && rich && (
            <DragHandle editor={editor}>
              <div className="rtf-drag-handle" title="Glisser pour déplacer ce bloc" aria-label="Déplacer le bloc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                  <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                  <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                </svg>
              </div>
            </DragHandle>
          )}
          <EditorContent editor={editor} />
        </div>
        {(uploading || uploadError) && (
          <div
            role="status"
            style={{
              padding: '7px 16px', fontSize: '12.5px', fontWeight: 600,
              borderTop: '1px solid var(--gray-200, #e5e7eb)',
              background: uploadError ? '#FEF2F2' : 'var(--gray-100, #f3f4f6)',
              color: uploadError ? '#B91C1C' : 'var(--gray-600, #4b5563)',
            }}
          >
            {uploadError ?? 'Envoi de l’image…'}
          </div>
        )}
      </div>
      {rich && (
        <p className="sub" style={{ fontSize: '12px', marginTop: '6px', color: 'var(--gray-500, #6b7280)' }}>
          Glissez des images directement dans le texte. Survolez un bloc pour le déplacer.
        </p>
      )}
      <style>{`
        .rtf-shell:focus-within { border-color: var(--primary, #1F5FBF); box-shadow: 0 0 0 3px rgba(31,95,191,.12); }
        .ProseMirror { outline: none; min-height: ${minHeight - 24}px; font-size: 15px; line-height: 1.6; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; float: left; height: 0; pointer-events: none; }
        .ProseMirror h2 { font-size: 20px; font-weight: 700; margin: 14px 0 8px; }
        .ProseMirror h3 { font-size: 17px; font-weight: 700; margin: 12px 0 6px; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 22px; }
        .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 12px; color: #6b7280; }
        .ProseMirror a { color: #2563eb; text-decoration: underline; }
        .ProseMirror code { background: var(--gray-100, #f3f4f6); border-radius: 4px; padding: 1px 6px; font-size: 13px; }
        .ProseMirror hr { border: none; border-top: 2px solid var(--gray-200, #e5e7eb); margin: 18px 0; }
        .ProseMirror img { max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 14px 0; }
        .ProseMirror img.ProseMirror-selectednode { outline: 2px solid var(--primary, #1F5FBF); outline-offset: 2px; }
        .rtf-drag-handle {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 5px; cursor: grab;
          color: var(--gray-400, #9ca3af); background: #fff;
          border: 1px solid var(--gray-200, #e5e7eb);
          transition: color .12s, background .12s, border-color .12s;
        }
        .rtf-drag-handle:hover { color: var(--gray-700, #374151); background: var(--gray-100, #f3f4f6); border-color: var(--gray-300, #d1d5db); }
        .rtf-drag-handle:active { cursor: grabbing; }
      `}</style>
    </div>
  );
}
