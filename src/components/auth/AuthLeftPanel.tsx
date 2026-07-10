'use client';
import Link from 'next/link';

type Props = {
  kicker?: string;
  headline: React.ReactNode;
  sub: string;
  showTestimonial?: boolean;
};

export function AuthLeftPanel({ kicker, headline, sub, showTestimonial = true }: Props) {
  return (
    <div
      className="relative hidden overflow-hidden md:flex flex-col p-10 lg:p-12 bg-[#1F5FBF]"
      aria-hidden="true"
    >
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
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center font-display font-extrabold text-base text-white bg-[#FF6B35]">
          YE
        </div>
        <span className="font-display text-xl font-extrabold">
          <span style={{ color: 'rgba(255,255,255,.9)' }}>YowYob</span>{' '}
          <span style={{ color: '#ffa215ff' }}>Education</span>
        </span>
        <Link
          href="/"
          className="ml-auto text-xs flex items-center gap-1.5 transition-colors"
          style={{ color: 'rgba(255,255,255,.5)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.85)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,.5)')}
        >

          <p style={{ color: 'white' }}>Retour</p>
        </Link>
      </div>

      {/* Center content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center py-8">
        {/* Kicker (optionnel) */}
        {kicker && (
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-display font-semibold tracking-[1.5px] uppercase mb-6 w-fit"
            style={{
              background: 'rgba(255,107,53,.15)',
              border: '1px solid rgba(255,107,53,.3)',
              color: '#FF6B35',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#FF6B35' }} />
            {kicker}
          </div>
        )}

        {/* Headline */}
        <h1
          className="font-display font-extrabold text-white leading-[1.15] mb-5"
          style={{ fontSize: 'clamp(26px,3vw,38px)' }}
        >
          {headline}
        </h1>

        {/* Sub */}
        <p className="text-base leading-[1.7] mb-8 max-w-[400px]" style={{ color: 'rgba(255,255,255,.65)' }}>
          {sub}
        </p>

        {/* Testimonial card (optionnel) */}
        {showTestimonial && (
          <div
            className="rounded-2xl p-6 mb-7 relative z-10"
            style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}
          >
            <p className="text-sm italic leading-[1.65] mb-4" style={{ color: 'rgba(255,255,255,.8)' }}>
              <span className="block font-serif leading-none mb-2 opacity-40" style={{ fontSize: '48px', color: '#FF6B35' }}>
                "
              </span>
              YowYob Education m'a permis de me reconvertir en 4 mois — gratuitement. Les exemples parlent de notre réalité africaine.
            </p>
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-xs text-white shrink-0 bg-[#FF6B35]"
                style={{ border: '2px solid rgba(255,255,255,.2)' }}
                aria-hidden="true"
              >
                MK
              </span>
              <div>
                <strong className="block font-display text-[13px] font-semibold text-white">Mariam Kaboré</strong>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,.5)' }}>Entrepreneuse · Ouagadougou</span>
              </div>
              <div className="ml-auto flex gap-0.5 text-[13px]" style={{ color: '#FF6B35' }}>
                {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
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
