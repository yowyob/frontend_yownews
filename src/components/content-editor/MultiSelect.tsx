'use client';
import { useEffect, useRef, useState } from 'react';

export type Option = { value: string; label: string };

type Props = {
  options: Option[];
  selected: string[];
  setSelected: (v: string[]) => void;
  placeholder?: string;
};

export default function MultiSelect({ options, selected, setSelected, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Reset search when opening/closing
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const toggle = (value: string) =>
    setSelected(selected.includes(value) ? selected.filter((x) => x !== value) : [...selected, value]);

  const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  // Filter options: always keep the first one (sentinel) at the top, filter others by search text
  const filteredOptions = options.filter((o, idx) => {
    if (idx === 0) return true;
    return o.label.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', textAlign: 'left', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px',
          padding: '10px 12px', fontSize: '14px', background: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minHeight: '42px',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ color: 'var(--gray-400, #9ca3af)' }}>{placeholder ?? 'Sélectionner…'}</span>
        ) : (
          selected.map((v) => (
            <span key={v} style={{ background: 'var(--gray-100, #f3f4f6)', borderRadius: '20px', padding: '2px 10px', fontSize: '13px' }}>
              {labelFor(v)}
            </span>
          ))
        )}
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 'auto', color: 'var(--gray-400, #9ca3af)' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', maxHeight: '280px', display: 'flex', flexDirection: 'column',
        }}>
          {/* Search box */}
          <div style={{ padding: '6px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '13px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '6px',
                outline: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div style={{ overflowY: 'auto', padding: '6px', flex: 1 }}>
            {filteredOptions.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--gray-400, #9ca3af)' }}>Aucune option</div>
            )}
            {filteredOptions.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px',
                  fontSize: '14px', cursor: 'pointer', background: checked ? 'rgba(37,99,235,.06)' : 'transparent',
                }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(o.value)} />
                  {o.label}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
