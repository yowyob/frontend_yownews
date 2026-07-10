'use client';
import { ReactNode } from 'react';
import { AuthLeftPanel } from './AuthLeftPanel';

type AuthLayoutProps = {
  kicker?: string;
  headline: ReactNode;
  sub: string;
  showTestimonial?: boolean;
  children: ReactNode;
};

export function AuthLayout({ kicker, headline, sub, showTestimonial, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] px-4 py-10 md:px-8">
      <div className="w-full max-w-[1000px] bg-white rounded-[20px] shadow-[0_20px_60px_rgba(15,23,42,.12)] overflow-hidden grid grid-cols-1 md:grid-cols-[42%_58%]">
        <AuthLeftPanel kicker={kicker} headline={headline} sub={sub} showTestimonial={showTestimonial} />

        <main className="flex flex-col items-center justify-center gap-6 px-6 py-10 md:px-12 md:py-12 md:gap-0" role="main">
          {/* Logo (mobile uniquement, le panneau gauche étant masqué) */}
          <div className="md:hidden flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[9px] flex items-center justify-center font-display font-extrabold text-sm text-white bg-[#FF6B35]">
              YE
            </div>
            <span className="font-display text-xl font-extrabold">
              <span className="text-[#1F5FBF]">YowYob</span>{' '}
              <span style={{ color: '#FF6B35' }}>Education</span>
            </span>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
