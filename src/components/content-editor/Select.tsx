'use client';
import { useEffect, useRef, useState } from 'react';

export type SelectOption = { value: string; label: string };

/**
 * Menu déroulant à sélection unique, stylé pour remplacer les `<select>` natifs (rendu OS
 * par défaut, peu cohérent avec le reste de l'interface) — mêmes interactions clavier de
 * base qu'un select classique, mais présentation alignée sur le design system de l'app.
 */
export default function Select({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', border: `1.5px solid ${open ? 'var(--primary, #1F5FBF)' : 'var(--gray-200, #e5e7eb)'}`,
          borderRadius: '10px', padding: '10px 13px', fontSize: '14px', background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', color: current ? 'var(--dark, #111827)' : 'var(--gray-400, #9ca3af)',
          boxShadow: open ? '0 0 0 3px rgba(31,95,191,.12)' : 'none', transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label ?? placeholder ?? 'Sélectionner…'}
        </span>
        <svg width="14" height="14" fill="none" stroke="var(--gray-400, #9ca3af)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: '260px', overflowY: 'auto', padding: '6px',
        }}>
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left',
                  padding: '9px 10px', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer',
                  background: selected ? 'rgba(31,95,191,.08)' : 'transparent', color: selected ? 'var(--primary, #1F5FBF)' : 'var(--gray-700, #374151)',
                  fontWeight: selected ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'var(--gray-50, #f9fafb)'; }}
                onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                {o.label}
                {selected && (
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
