'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Block, type BlockType, emptyBlock } from './types';
import { parseHtml, serializeBlocks } from './serialize';

export type EditorMode = 'newsletter' | 'education';

interface PaletteDef {
  type: BlockType;
  label: string;
  tag: string;
  max?: number;
}

const PALETTE: Record<EditorMode, PaletteDef[]> = {
  education: [
    { type: 'heading', label: 'Titre', tag: 'H' },
    { type: 'paragraph', label: 'Paragraphe', tag: 'TXT' },
    { type: 'list', label: 'Liste', tag: 'LI' },
    { type: 'quote', label: 'Citation', tag: 'QT' },
    { type: 'callout', label: 'Encadré', tag: 'BOX' },
    { type: 'image', label: 'Image', tag: 'IMG' },
    { type: 'divider', label: 'Séparateur', tag: 'HR' },
  ],
  newsletter: [
    { type: 'heading', label: 'Titre', tag: 'H' },
    { type: 'paragraph', label: 'Paragraphe', tag: 'TXT' },
    { type: 'list', label: 'Liste', tag: 'LI' },
    { type: 'quote', label: 'Citation', tag: 'QT' },
    { type: 'callout', label: 'Encadré', tag: 'BOX' },
    { type: 'image', label: 'Image', tag: 'IMG', max: 1 },
    { type: 'file', label: 'Fichier', tag: 'PJ', max: 1 },
    { type: 'divider', label: 'Séparateur', tag: 'HR' },
  ],
};

const ACCEPTED_IMAGE = 'image/png,image/jpeg,image/gif,image/webp,image/avif';

async function uploadFile(endpoint: string, file: File): Promise<{ url: string; name: string }> {
  const body = new FormData();
  body.append('file', file, file.name);
  const res = await fetch(endpoint, { method: 'POST', body });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error?.message ?? payload?.message ?? "L'envoi du fichier a échoué.");
  const url = payload?.data?.url ?? payload?.url;
  if (!url) throw new Error('Réponse inattendue du serveur.');
  return { url, name: file.name };
}

function Editable({
  tag,
  initialHtml,
  placeholder,
  onChange,
  onFocus,
  style,
  editRef,
}: {
  tag: string;
  initialHtml: string;
  placeholder?: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
  style?: React.CSSProperties;
  // Ref transmise par le parent pour que la barre de formatage puisse lire/écrire l'innerHTML.
  editRef?: React.RefObject<HTMLElement | null>;
}) {
  const internal = useRef<HTMLElement>(null);
  const ref = editRef ?? internal;
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) ref.current.innerHTML = initialHtml;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return createElement(tag, {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    'data-placeholder': placeholder,
    style,
    onInput: () => onChange((ref.current as HTMLElement).innerHTML),
    onFocus,
  });
}

// Barre de formatage inline — définie au niveau module (identité stable) pour ne pas se remonter à
// chaque rendu du bloc, ce qui perturbait la sélection au moment du clic.
function InlineToolbar({ onCmd }: { onCmd: (cmd: string) => void }) {
  const btn = (cmd: string, label: React.ReactNode) => (
    <button type="button" onMouseDown={(e) => { e.preventDefault(); onCmd(cmd); }}>{label}</button>
  );
  return (
    <div className="be-inline-tb">
      {btn('bold', <b>B</b>)}
      {btn('italic', <i>I</i>)}
      {btn('underline', <u>U</u>)}
    </div>
  );
}

// Tailles/graisses explicites par niveau : le Preflight de Tailwind aplatit h1/h2/h3, il faut donc
// les fixer en inline (mêmes valeurs que la sérialisation, pour que l'éditeur = la page publiée).
const HEADING_STYLE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { fontSize: 30, fontWeight: 800, lineHeight: 1.2 },
  2: { fontSize: 24, fontWeight: 700, lineHeight: 1.25 },
  3: { fontSize: 19, fontWeight: 700, lineHeight: 1.3 },
};

function BlockBody({
  block,
  active,
  onChange,
  onActivate,
}: {
  block: Block;
  active: boolean;
  onChange: (patch: Partial<Block>) => void;
  onActivate: () => void;
}) {
  const textStyle: React.CSSProperties = { outline: 'none', width: '100%' };
  const editRef = useRef<HTMLElement>(null);

  // Applique le formatage à la sélection courante PUIS resynchronise block.html depuis le DOM :
  // execCommand ne déclenche pas toujours onInput de façon fiable. styleWithCSS=false → <b>/<i>/<u>.
  const runCmd = (cmd: string) => {
    try { document.execCommand('styleWithCSS', false, 'false'); } catch { /* noop */ }
    document.execCommand(cmd, false);
    if (editRef.current) onChange({ html: editRef.current.innerHTML } as Partial<Block>);
  };
  const toolbar = active ? <InlineToolbar onCmd={runCmd} /> : null;

  switch (block.type) {
    case 'heading':
      return (
        <div>
          <div className="be-level-row">
            {[1, 2, 3].map((l) => (
              <button key={l} type="button" className={`be-level ${block.level === l ? 'active' : ''}`} onClick={() => onChange({ level: l as 1 | 2 | 3 })}>
                Niv. {l}
              </button>
            ))}
            {toolbar}
          </div>
          <Editable editRef={editRef} tag={`h${block.level}`} initialHtml={block.html} placeholder="Titre…" onChange={(html) => onChange({ html })} onFocus={onActivate} style={{ ...textStyle, margin: 0, fontFamily: 'var(--font-d)', color: 'var(--dark)', ...HEADING_STYLE[block.level] }} />
        </div>
      );
    case 'paragraph':
      return (
        <div>
          {toolbar}
          <Editable editRef={editRef} tag="p" initialHtml={block.html} placeholder="Écrivez un paragraphe…" onChange={(html) => onChange({ html })} onFocus={onActivate} style={{ ...textStyle, margin: 0, lineHeight: 1.7, color: 'var(--gray-700, #374151)' }} />
        </div>
      );
    case 'quote':
      return (
        <div>
          {toolbar}
          <Editable editRef={editRef} tag="blockquote" initialHtml={block.html} placeholder="Citation…" onChange={(html) => onChange({ html })} onFocus={onActivate} style={{ ...textStyle, margin: 0, borderLeft: '3px solid var(--accent)', paddingLeft: 14, fontStyle: 'italic', color: 'var(--gray-600)' }} />
        </div>
      );
    case 'callout':
      return (
        <div>
          {toolbar}
          <Editable editRef={editRef} tag="div" initialHtml={block.html} placeholder="Encadré…" onChange={(html) => onChange({ html })} onFocus={onActivate} style={{ ...textStyle, background: 'var(--blue-light)', borderLeft: '3px solid var(--primary)', padding: '14px 18px', borderRadius: 10 }} />
        </div>
      );
    case 'list':
      return (
        <div>
          <div className="be-level-row">
            <button type="button" className={`be-level ${!block.ordered ? 'active' : ''}`} onClick={() => onChange({ ordered: false })}>• Puces</button>
            <button type="button" className={`be-level ${block.ordered ? 'active' : ''}`} onClick={() => onChange({ ordered: true })}>1. Numéros</button>
            {toolbar}
          </div>
          <Editable editRef={editRef} tag={block.ordered ? 'ol' : 'ul'} initialHtml={block.html} placeholder="Élément…" onChange={(html) => onChange({ html })} onFocus={onActivate} style={{ ...textStyle, margin: 0, paddingLeft: 22, color: 'var(--gray-700, #374151)' }} />
        </div>
      );
    case 'image':
      return block.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={block.src} alt={block.alt} style={{ maxWidth: '100%', borderRadius: 10, display: 'block' }} />
      ) : (
        <div className="be-placeholder">Image en cours d’envoi…</div>
      );
    case 'file':
      return block.url ? (
        <a className="be-file-chip" href={block.url} target="_blank" rel="noreferrer">
          <span className="be-file-ic">PDF</span>
          <span>{block.name || 'Fichier'}</span>
        </a>
      ) : (
        <div className="be-placeholder">Fichier en cours d’envoi…</div>
      );
    case 'button':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input className="be-field" value={block.label} placeholder="Libellé du bouton" onChange={(e) => onChange({ label: e.target.value })} />
          <input className="be-field" value={block.href} placeholder="https://lien-du-bouton" onChange={(e) => onChange({ href: e.target.value })} />
        </div>
      );
    case 'divider':
      return <hr style={{ border: 0, borderTop: '2px solid var(--gray-200)', margin: '6px 0' }} />;
  }
}

function SortableBlock({
  block,
  active,
  onChange,
  onActivate,
  onRemove,
}: {
  block: Block;
  active: boolean;
  onChange: (patch: Partial<Block>) => void;
  onActivate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      className="be-block"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, borderColor: active ? 'var(--primary)' : 'var(--gray-200)' }}
    >
      <button type="button" className="be-handle" {...attributes} {...listeners} title="Glisser pour déplacer" aria-label="Déplacer le bloc">⠿</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <BlockBody block={block} active={active} onChange={onChange} onActivate={onActivate} />
      </div>
      <button type="button" className="be-remove" onClick={onRemove} title="Supprimer le bloc" aria-label="Supprimer">×</button>
    </div>
  );
}

function PaletteItem({ def, disabled, onAdd }: { def: PaletteDef; disabled: boolean; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${def.type}`,
    data: { kind: 'palette', blockType: def.type },
    disabled,
  });
  return (
    <div
      ref={setNodeRef}
      className={`be-pal-item ${disabled ? 'disabled' : ''}`}
      style={{ opacity: isDragging ? 0.4 : disabled ? 0.4 : 1, cursor: disabled ? 'not-allowed' : 'grab' }}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
      onClick={() => { if (!disabled) onAdd(); }}
      title={disabled ? 'Limite atteinte' : 'Glisser dans le contenu, ou cliquer pour ajouter'}
    >
      <span>{def.label}</span>
      <span className="be-pal-tag">{def.tag}</span>
    </div>
  );
}

export default function BlockEditor({
  value,
  onChange,
  mode,
  uploadEndpoint,
}: {
  value: string;
  onChange: (html: string) => void;
  mode: EditorMode;
  uploadEndpoint: string;
}) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseHtml(value));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<BlockType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => { onChange(serializeBlocks(blocks)); /* eslint-disable-next-line */ }, [blocks]);

  const counts = useMemo(() => {
    const c: Partial<Record<BlockType, number>> = {};
    for (const b of blocks) c[b.type] = (c[b.type] ?? 0) + 1;
    return c;
  }, [blocks]);

  function isDisabled(def: PaletteDef): boolean {
    return def.max != null && (counts[def.type] ?? 0) >= def.max;
  }

  function patch(id: string, p: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));
  }
  function remove(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function insertBlock(type: BlockType, index: number) {
    const block = emptyBlock(type);
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index < 0 ? next.length : index, 0, block);
      return next;
    });
    if (type === 'image') { pendingRef.current = block.id; setTimeout(() => imageInputRef.current?.click(), 0); }
    if (type === 'file') { pendingRef.current = block.id; setTimeout(() => fileInputRef.current?.click(), 0); }
  }

  async function onPickImage(file: File | null) {
    const id = pendingRef.current; pendingRef.current = null;
    if (!id) return;
    if (!file) { remove(id); return; }
    setError(null);
    try {
      const { url } = await uploadFile(uploadEndpoint, file);
      patch(id, { src: url, alt: file.name } as Partial<Block>);
    } catch (e) { remove(id); setError(e instanceof Error ? e.message : "Envoi de l'image impossible."); }
  }

  async function onPickFile(file: File | null) {
    const id = pendingRef.current; pendingRef.current = null;
    if (!id) return;
    if (!file) { remove(id); return; }
    setError(null);
    try {
      const { url, name } = await uploadFile(uploadEndpoint, file);
      patch(id, { url, name } as Partial<Block>);
    } catch (e) { remove(id); setError(e instanceof Error ? e.message : 'Envoi du fichier impossible.'); }
  }

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current;
    if (data?.kind === 'palette') setDragType(data.blockType as BlockType);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setDragType(null);
    const data = active.data.current;
    if (data?.kind === 'palette') {
      const type = data.blockType as BlockType;
      const overIndex = over ? blocks.findIndex((b) => b.id === over.id) : -1;
      insertBlock(type, overIndex < 0 ? blocks.length : overIndex);
      return;
    }
    if (over && active.id !== over.id) {
      const from = blocks.findIndex((b) => b.id === active.id);
      const to = blocks.findIndex((b) => b.id === over.id);
      if (from !== -1 && to !== -1) setBlocks((prev) => arrayMove(prev, from, to));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="be-shell">
        <aside className="be-palette">
          <div className="be-pal-label">Blocs de contenu</div>
          <div className="be-pal-list">
            {PALETTE[mode].map((def) => (
              <PaletteItem key={def.type} def={def} disabled={isDisabled(def)} onAdd={() => insertBlock(def.type, blocks.length)} />
            ))}
          </div>
          <p className="be-pal-hint">Glissez un bloc dans le contenu, ou cliquez pour l’ajouter à la fin.</p>
        </aside>

        <div className="be-canvas-wrap">
          {error && <div className="be-error">{error}</div>}
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="be-canvas">
              {blocks.length === 0 && (
                <div className="be-empty">Glissez un bloc depuis la gauche pour commencer votre contenu.</div>
              )}
              {blocks.map((b) => (
                <SortableBlock
                  key={b.id}
                  block={b}
                  active={activeId === b.id}
                  onChange={(p) => patch(b.id, p)}
                  onActivate={() => setActiveId(b.id)}
                  onRemove={() => remove(b.id)}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept={ACCEPTED_IMAGE} style={{ display: 'none' }} onChange={(e) => { onPickImage(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => { onPickFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />

      <DragOverlay>{dragType ? <div className="be-drag-ghost">{PALETTE[mode].find((d) => d.type === dragType)?.label}</div> : null}</DragOverlay>

      <style>{`
        .be-shell { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; }
        .be-palette { position: sticky; top: 16px; background: #fff; border: 1px solid var(--gray-200); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.04); }
        .be-pal-label { font-family: var(--font-d); font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: var(--accent); font-weight: 700; }
        .be-pal-hint { font-size: 12px; color: var(--gray-500); margin: 12px 0 0; line-height: 1.5; }
        .be-pal-list { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
        .be-pal-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid var(--gray-200); border-radius: 10px; background: #fff; font-size: 13px; font-weight: 500; transition: border-color .15s, box-shadow .15s; }
        .be-pal-item:hover:not(.disabled) { border-color: var(--primary); box-shadow: 0 2px 8px rgba(31,95,191,.1); }
        .be-pal-tag { font-family: var(--font-d); font-size: 10px; color: var(--gray-400); border: 1px solid var(--gray-200); padding: 2px 6px; border-radius: 6px; font-weight: 700; }
        .be-canvas-wrap { min-width: 0; }
        .be-canvas { display: flex; flex-direction: column; gap: 10px; background: #fff; border: 1px solid var(--gray-100); border-radius: 14px; padding: 22px; min-height: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .be-empty { color: var(--gray-400); font-size: 14px; text-align: center; padding: 60px 20px; border: 2px dashed var(--gray-200); border-radius: 12px; }
        .be-block { display: flex; align-items: flex-start; gap: 8px; border: 1px solid var(--gray-200); border-radius: 12px; padding: 12px; background: #fff; transition: border-color .15s; }
        .be-handle { border: 0; background: none; cursor: grab; color: var(--gray-400); font-size: 16px; line-height: 1; padding: 4px 2px; flex-shrink: 0; }
        .be-handle:active { cursor: grabbing; }
        .be-remove { border: 0; background: none; cursor: pointer; color: var(--gray-400); font-size: 18px; line-height: 1; padding: 0 4px; flex-shrink: 0; }
        .be-remove:hover { color: var(--accent); }
        .be-block [contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--gray-400); }
        .be-level-row { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; flex-wrap: wrap; }
        .be-level { font-family: var(--font-d); font-size: 11px; padding: 3px 9px; border: 1px solid var(--gray-200); border-radius: 6px; background: #fff; color: var(--gray-600); cursor: pointer; font-weight: 600; }
        .be-level.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .be-inline-tb { display: inline-flex; gap: 3px; margin-left: auto; }
        .be-inline-tb button { width: 26px; height: 24px; border: 1px solid var(--gray-200); background: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
        .be-field { border: 1px solid var(--gray-200); border-radius: 10px; padding: 8px 12px; font-size: 13px; width: 100%; box-sizing: border-box; }
        .be-placeholder { color: var(--gray-400); font-size: 13px; padding: 14px; border: 1px dashed var(--gray-200); border-radius: 10px; }
        .be-file-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid var(--gray-200); border-radius: 10px; text-decoration: none; color: var(--dark); font-size: 13px; font-weight: 600; }
        .be-file-ic { font-family: var(--font-d); font-size: 10px; font-weight: 700; color: #fff; background: var(--accent); padding: 3px 6px; border-radius: 4px; }
        .be-error { background: #FEF2F2; color: #B91C1C; font-size: 13px; padding: 8px 12px; border-radius: 10px; margin-bottom: 10px; }
        .be-drag-ghost { font-family: var(--font-d); background: var(--primary); color: #fff; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
        @media (max-width: 860px) { .be-shell { grid-template-columns: 1fr; } .be-palette { position: static; } }
      `}</style>
    </DndContext>
  );
}
