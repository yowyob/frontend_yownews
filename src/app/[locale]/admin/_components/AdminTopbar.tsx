'use client';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function AdminTopbar({ displayName }: { displayName: string }) {
  const [search, setSearch] = useState('');

  return (
    <header style={{
      height: '64px', background: '#fff', borderBottom: '1px solid var(--gray-200)',
      display: 'flex', alignItems: 'center', padding: '0 32px', gap: '16px',
      position: 'sticky', top: 0, zIndex: 100, flexShrink: 0, boxShadow: 'var(--sh-sm)',
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flex: 1 }}>
        <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,var(--blue),var(--accent))', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>YN</div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '17px', fontWeight: 800, color: 'var(--primary)' }}>
          Yow<span style={{ color: 'var(--accent)' }}>News</span>
        </span>
      </Link>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '20px', padding: '8px 16px', width: '280px', transition: 'border-color .2s' }}
        onFocusCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)')}
        onBlurCapture={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-200)')}
        className="tb-search-wrap">
        <svg width="15" height="15" fill="none" stroke="var(--gray-400)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…" aria-label="Rechercher"
          style={{ border: 'none', background: 'transparent', fontSize: '13px', color: 'var(--dark)', outline: 'none', width: '100%', fontFamily: 'var(--font-b)' }}
        />
      </div>

      {/* Notification bell */}
      <button aria-label="Notifications" style={{
        position: 'relative', width: '38px', height: '38px', borderRadius: '50%',
        border: '1px solid var(--gray-200)', background: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--gray-500)', transition: 'all .2s',
      }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--gray-50)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#fff'; (e.currentTarget as HTMLElement).style.color = 'var(--gray-500)'; }}
      >
        <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span style={{
          position: 'absolute', top: '-2px', right: '-2px', width: '16px', height: '16px', borderRadius: '50%',
          background: 'var(--accent)', color: '#fff', fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-d)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff',
        }}>5</span>
      </button>

      {/* User avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 8px', borderRadius: '8px', transition: 'background .2s' }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--gray-50)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--blue),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-d)', fontWeight: 800, fontSize: '13px', color: '#fff', flexShrink: 0 }}>
          {initials(displayName)}
        </div>
        <span style={{ fontFamily: 'var(--font-d)', fontSize: '13px', fontWeight: 600, color: 'var(--dark)' }} className="tb-name">
          {displayName.split(' ')[0]}
        </span>
        <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14" height="14" style={{ color: 'var(--gray-400)' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      <style>{`@media(max-width:768px){.tb-search-wrap,.tb-name{display:none!important}}`}</style>
    </header>
  );
}
