'use client';
import Link from 'next/link';

type Props = {
  kicker: string;
  headline: React.ReactNode;
  sub: string;
};

export function AuthLeftPanel({ kicker, headline, sub }: Props) {
  return (
    <div
      className="relative hidden overflow-hidden md:flex flex-col p-12 lg:p-14"
      style={{ background: 'linear-gradient(145deg,#0F3460 0%,#1565C0 60%,#1976D2 100%)' }}
      aria-hidden="true"
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glows */}
      <div
        className="absolute -top-36 -right-24 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle,rgba(255,255,255,.12) 0%,transparent 65%)',
        }}
      />
      <div
        className="absolute -bottom-48 -left-24 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle,rgba(255,107,53,.18) 0%,transparent 65%)',
        }}
      />

      {/* Dot decoration */}
      <div className="absolute bottom-24 right-14 opacity-10 pointer-events-none">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <defs>
            <pattern id="dp-left" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="#FF6B35" />
            </pattern>
          </defs>
          <rect width="160" height="160" fill="url(#dp-left)" />
        </svg>
      </div>

      {/* Logo + back */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center font-display font-extrabold text-base text-white"
          style={{ background: 'linear-gradient(135deg,#1565C0,#FF6B35)' }}
        >
          YN
        </div>
        <span className="font-display text-xl font-extrabold">
          <span style={{ color: 'rgba(255,255,255,.9)' }}>Yow</span>
          <span style={{ color: '#FF6B35' }}>News</span>
        </span>
        <Link
          href="/"
          className="ml-auto text-xs flex items-center gap-1.5 transition-colors"
          style={{ color: 'rgba(255,255,255,.5)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.85)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.5)')}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Retour
        </Link>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
        {/* Kicker */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-display font-semibold tracking-[1.5px] uppercase mb-7"
          style={{
            background: 'rgba(255,107,53,.15)',
            border: '1px solid rgba(255,107,53,.3)',
            color: '#FFB347',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#FF6B35' }}
          />
          {kicker}
        </div>

        {/* Headline */}
        <h1
          className="font-display font-extrabold text-white leading-[1.15] mb-5"
          style={{ fontSize: 'clamp(28px,3.5vw,44px)' }}
        >
          {headline}
        </h1>

        {/* Sub */}
        <p className="text-base leading-[1.7] mb-9 max-w-[400px]" style={{ color: 'rgba(255,255,255,.65)' }}>
          {sub}
        </p>

        {/* Testimonial card */}
        <div
          className="rounded-2xl p-6 mb-7 relative z-10"
          style={{
            background: 'rgba(255,255,255,.07)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,.1)',
          }}
        >
          <p className="text-sm italic leading-[1.65] mb-4" style={{ color: 'rgba(255,255,255,.8)' }}>
            <span
              className="block font-serif leading-none mb-2 opacity-40"
              style={{ fontSize: '48px', color: '#FF6B35' }}
            >
              "
            </span>
            YowNews m'a permis de me reconvertir en 4 mois — gratuitement. Les exemples parlent de notre réalité africaine.
          </p>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://picsum.photos/seed/testi-auth/72/72"
              alt="Mariam Kaboré"
              className="w-9 h-9 rounded-full object-cover"
              style={{ border: '2px solid rgba(255,255,255,.2)' }}
            />
            <div>
              <strong className="block font-display text-[13px] font-semibold text-white">Mariam Kaboré</strong>
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Entrepreneuse · Ouagadougou</span>
            </div>
            <div className="ml-auto flex gap-0.5 text-[13px]" style={{ color: '#FF6B35' }}>
              {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex gap-8 pt-7"
          style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}
        >
          {[
            { num: '8 500+', lbl: 'Apprenants actifs' },
            { num: '12', lbl: 'Pays africains' },
            { num: '100%', lbl: 'Gratuit' },
          ].map((s) => (
            <div key={s.lbl}>
              <div className="font-display text-[22px] font-bold text-white">{s.num}</div>
              <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,.45)' }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
