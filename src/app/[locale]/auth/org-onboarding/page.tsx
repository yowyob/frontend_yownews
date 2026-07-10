'use client';
import { Link } from '@/i18n/navigation';
import { AuthLayout } from '@/components/auth/AuthLayout';

/**
 * Onboarding « organisation » après une inscription en mode BUSINESS.
 * yowyob-edu ne crée PAS d'organisations (elles naissent via le canal KSM) : cet écran
 * oriente le représentant selon sa situation pour que son org apparaisse à son login.
 */
export default function OrgOnboardingPage() {
  const steps = [
    {
      title: 'Votre organisation existe déjà et vous en êtes le propriétaire ou un membre',
      body: (
        <>
          Connectez-vous avec le compte KSM déjà rattaché à votre organisation (même s&apos;il a été créé
          sur une autre plateforme) : vos organisations apparaîtront automatiquement à la connexion et
          vous pourrez sélectionner la vôtre.
        </>
      ),
      action: (
        <Link
          href="/auth/login"
          className="inline-block mt-3 px-4 py-2 rounded-[8px] text-sm font-semibold text-white transition-colors"
          style={{ background: '#1F5FBF' }}
        >
          Se connecter avec ce compte
        </Link>
      ),
    },
    {
      title: 'Votre organisation existe, mais vous n&apos;y êtes pas encore rattaché',
      body: (
        <>
          Demandez au propriétaire de votre organisation de vous <strong>inviter par email</strong> depuis
          son espace « Mon organisation » (avec l&apos;adresse email de ce compte). Une fois l&apos;invitation
          acceptée, reconnectez-vous : votre organisation apparaîtra à la connexion.
        </>
      ),
    },
    {
      title: 'Votre organisation n&apos;existe pas encore',
      body: (
        <>
          Les organisations ne sont pas créées sur YowYob Education : elles naissent via le canal KSM (le guichet
          d&apos;enregistrement des organisations). Rapprochez-vous de ce canal pour enregistrer votre
          organisation avec vous comme porteur ; dès qu&apos;elle sera créée, elle apparaîtra à votre
          connexion sur YowYob Education.
        </>
      ),
    },
  ];

  return (
    <AuthLayout
      kicker="Espace organisations"
      headline={
        <>
          Publiez sur YowYob Education<br />au nom de votre<br />
          <span style={{ color: '#FF6B35' }}>organisation</span>
        </>
      }
      sub="Votre compte est créé. Reliez maintenant votre organisation pour demander le statut d'organisation éditrice."
    >
        <div className="w-full max-w-[440px]">
          <div className="mb-8">
            <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-2">
              Compte créé ! Et votre organisation ?
            </h2>
            <p className="text-[15px] text-[#64748B]">
              YowYob Education ne crée pas d&apos;organisations : elles sont rattachées à votre compte via KSM.
              Choisissez la situation qui vous correspond.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <div key={i} className="rounded-[12px] border-[1.5px] border-gray-200 p-5">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center font-display font-bold text-xs text-white shrink-0 bg-[#1F5FBF]">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-[15px] font-bold text-[#0F172A] mb-1.5">{step.title}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{step.body}</p>
                    {step.action}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm text-[#64748B]">
            Une fois votre organisation visible à la connexion, vous pourrez demander le statut
            <strong> « organisation éditrice »</strong> à l&apos;équipe YowYob Education pour publier en son nom.
          </p>

          <Link href="/" className="inline-block mt-4 text-sm text-[#1F5FBF] font-medium hover:text-[#FF6B35] transition-colors">
             Continuer la lecture sur YowYob Education
          </Link>
        </div>
    </AuthLayout>
  );
}
