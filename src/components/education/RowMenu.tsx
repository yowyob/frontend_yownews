'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type MenuItem = { label: string; onClick: () => void; danger?: boolean };

// Menu d'actions « ⋮ » par ligne de table — partagé entre l'espace Rédacteur et la gestion admin.
// Le dropdown est rendu dans un portal (position fixed) pour ne pas être rogné par un
// conteneur parent en `overflow: hidden` (cas des tables aux coins arrondis).
export default function RowMenu({ items, disabled }: { items: MenuItem[]; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    // Repli au-dessus si peu de place en bas (menu ~ items*36 + 8).
    const estHeight = items.length * 38 + 8;
    const top = spaceBelow < estHeight && r.top > estHeight ? r.top - estHeight - 4 : r.bottom + 4;
    setPos({ top, right: Math.max(8, window.innerWidth - r.right) });
  };

  useLayoutEffect(() => { if (open) place(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => setOpen(false);
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open]);

  return (
    <>
      <button ref={btnRef} type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label="Actions" style={{
        border: 'none', background: 'none', cursor: disabled ? 'default' : 'pointer', fontSize: '20px',
        lineHeight: 1, padding: '4px 10px', color: 'var(--gray-500, #6b7280)', borderRadius: '6px',
      }}>⋮</button>
      {open && pos && createPortal(
        <div ref={menuRef} style={{
          position: 'fixed', top: pos.top, right: pos.right, zIndex: 1000, background: '#fff',
          border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
          minWidth: '180px', overflow: 'hidden',
        }}>
          {items.map((it) => (
            <button key={it.label} type="button" onClick={() => { setOpen(false); it.onClick(); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: '13px',
              border: 'none', background: 'none', cursor: 'pointer', color: it.danger ? '#B91C1C' : 'var(--gray-700, #374151)',
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50, #f9fafb)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >{it.label}</button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
