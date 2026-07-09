import type { ReactNode } from 'react';

const IC = {
  users: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  doc: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  cap: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
    </svg>
  ),
  globe: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
    </svg>
  ),
};

const STATS: { ic: ReactNode; n: string; l: string }[] = [
  { ic: IC.users, n: '15 000+', l: 'personnes accompagnées dans leur formation' },
  { ic: IC.doc, n: '2 400+', l: 'histoires et analyses racontées' },
  { ic: IC.cap, n: '180+', l: 'parcours pour apprendre à votre rythme' },
  { ic: IC.globe, n: '10 / 10', l: 'régions du Cameroun, une seule communauté' },
];

export function StatsBar() {
  return (
    <section className="lv-stats">
      <div className="lv-container lv-stats-grid">
        {STATS.map((s) => (
          <div key={s.l}>
            <div className="lv-stat-ic">{s.ic}</div>
            <div className="lv-stat-n">{s.n}</div>
            <div className="lv-stat-l">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
