'use client';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';

export default function SignUpPage() {
  const targetUrl = process.env.NEXT_PUBLIC_CREATE_ACCOUNT_URL || '#';

  return (
    <AuthLayout
      headline={
        <>
          Création de <span style={{ color: '#FF6B35' }}>compte</span>
        </>
      }
      sub="Rejoins la plateforme éducative panafricaine YowYob Education."
      showTestimonial={false}
    >
      <div className="w-full max-w-[420px] text-center flex flex-col items-center py-4">
        {/* Icone d'illustration / redirection */}
        <div className="w-16 h-16 rounded-2xl bg-[#FFF3EC] border border-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] mb-6 shadow-sm">
          <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>

        {/* Message de redirection */}
        <h2 className="font-display text-[24px] md:text-[26px] font-extrabold text-[#0F172A] mb-3 leading-snug">
          Vous allez être redirigé vers la plateforme de création de compte
        </h2>

        <p className="text-sm text-[#64748B] mb-8 leading-relaxed">
          Pour finaliser votre inscription et accéder à l&apos;ensemble de nos services, poursuivez sur notre portail dédié.
        </p>

        {/* Bouton Orange CTA */}
        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-6 rounded-[10px] font-display font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] shadow-[0_4px_14px_rgba(255,107,53,.25)] active:scale-[0.99] transition-all duration-200 text-center block"
        >
          Créer un compte
        </a>

        {/* Navigation retour vers la connexion */}
        <div className="mt-8 pt-6 border-t border-gray-100 w-full text-center">
          <p className="text-sm text-[#64748B]">
            Vous avez déjà un compte ?{' '}
            <Link href="/auth/login" className="text-[#1F5FBF] font-semibold hover:text-[#FF6B35] transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
