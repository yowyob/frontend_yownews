'use client';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';

/**
 * Éditeur riche TipTap partagé par tous les types de contenu (blog, transcription de
 * podcast, unités de cours…) — un seul socle pour que l'expérience de rédaction reste
 * cohérente, chaque espace d'édition ne fournissant que son placeholder/contenu initial.
 */
export function useRichTextEditor({ content, placeholder }: { content?: string; placeholder?: string }) {
  return useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? 'Rédigez ici…' }),
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

function Toolbar({ editor }: { editor: Editor | null }) {
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

export default function RichTextField({ editor, label = 'Contenu', minHeight = 220 }: { editor: Editor | null; label?: string; minHeight?: number }) {
  return (
    <div>
      <label style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block', color: 'var(--gray-700, #374151)' }}>{label}</label>
      <div className="rtf-shell" style={{ border: '1.5px solid var(--gray-200, #e5e7eb)', borderRadius: '12px', overflow: 'hidden', background: '#fff', transition: 'border-color .15s, box-shadow .15s' }}>
        <Toolbar editor={editor} />
        <div style={{ padding: '14px 16px', minHeight }}>
          <EditorContent editor={editor} />
        </div>
      </div>
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
      `}</style>
    </div>
  );
}
