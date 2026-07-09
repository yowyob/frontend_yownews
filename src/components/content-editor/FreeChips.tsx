'use client';
import { useState } from 'react';

type Props = {
  values: string[];
  setValues: (v: string[]) => void;
  placeholder?: string;
  // Slugifie (minuscule, espaces→tirets, sans #) — utile pour les tags. Sinon texte brut (trim).
  slugify?: boolean;
  max?: number;
};

function normalize(raw: string, slugify: boolean): string {
  const t = raw.trim();
  if (!slugify) return t;
  return t.toLowerCase().replace(/^#+/, '').replace(/\s+/g, '-');
}

export default function FreeChips({ values, setValues, placeholder, slugify = false, max = 10 }: Props) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = normalize(draft, slugify);
    if (v && !values.includes(v) && values.length < max) setValues([...values, v]);
    setDraft('');
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: '8px', padding: '8px' }}>
      {values.map((v) => (
        <span key={v} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(37,99,235,.08)', color: 'var(--blue, #2563eb)', borderRadius: '20px', padding: '3px 9px', fontSize: '13px' }}>
          {slugify ? `#${v}` : v}
          <button type="button" onClick={() => setValues(values.filter((x) => x !== v))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>×</button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={values.length === 0 ? (placeholder ?? 'saisir puis Entrée') : ''}
        style={{ border: 'none', outline: 'none', flex: 1, minWidth: '140px', fontSize: '13px' }}
      />
    </div>
  );
}
