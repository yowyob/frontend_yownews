'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { useSession } from '@/components/providers/session-provider';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthButton, SocialAuthButton } from '@/components/auth/AuthButton';
import { isPlatformAdmin, isEducationEditor } from '@/lib/roles';

type LoginResult = {
  requiresSignUp?: boolean;
  // KSM ne reconnaît plus l'ancien email comme identifiant de connexion : il renvoie l'identifiant
  // Yowyob (username) par email. `message` porte le texte KSM à afficher.
  requiresIdentifier?: boolean;
  // Compte existant mais pas encore membre : on propose « Rejoindre » (envoie l'invitation, qui
  // attribue le rôle) ; il suffit ensuite de se reconnecter.
  requiresJoin?: boolean;
  pendingId?: string;
  message?: string;
  email?: string;
  user?: { permissions?: string[]; roles: string[] };
};

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Étape « Identifiant Yowyob envoyé » — l'email n'est plus un identifiant de connexion ; KSM
  // vient d'envoyer l'identifiant par email. On invite l'utilisateur à réessayer avec cet identifiant.
  const [identifierNotice, setIdentifierNotice] = useState<string | null>(null);

  // Étape « Rejoindre » — le compte existe mais ne fait pas encore partie de l'organisation.
  // « Rejoindre » émet l'invitation (qui attribue le rôle) ; il suffit ensuite de se reconnecter.
  const [joinStep, setJoinStep] = useState<{ pendingId: string; email: string } | null>(null);
  const [joinState, setJoinState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  // Consentement obligatoire aux CGU/Confidentialité/Cookies avant d'obtenir le rôle lecteur
  // (case à cocher requise pour activer « Rejoindre »).
  const [termsAccepted, setTermsAccepted] = useState(false);

  function validate() {
    const errs: typeof fieldErrors = {};
    // Le champ accepte un email OU un identifiant Yowyob (username) : on exige seulement un champ
    // non vide (KSM tranche ensuite email/identifiant).
    if (!email.trim()) {
      errs.email = 'Veuillez entrer votre email ou identifiant Yowyob.';
    }
    if (password.length < 8) {
      errs.password = 'Le mot de passe doit comporter au moins 8 caractères.';
    }
    return errs;
  }

  // Validation au blur : signale l'erreur dès que l'utilisateur quitte un champ invalide,
  // au lieu d'attendre le submit (heuristique de Nielsen n°9 — prévention des erreurs).
  function handleBlurEmail() {
    if (!email) return;
    setFieldErrors((p) => ({ ...p, email: validate().email }));
  }
  function handleBlurPassword() {
    if (!password) return;
    setFieldErrors((p) => ({ ...p, password: validate().password }));
  }

  async function finishLogin(res: LoginResult) {
    await refresh();
    const authorities = res.user?.permissions ?? res.user?.roles ?? [];
    const destination = isPlatformAdmin(authorities)
      ? '/admin/dashboard'
      : isEducationEditor(authorities)
        ? '/editor/dashboard'
        : '/';
    router.push(destination);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setGlobalError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResult>('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
      });
      // L'email saisi n'est plus un identifiant de connexion : KSM a envoyé l'identifiant Yowyob
      // par email → écran d'information (ne pas router vers l'inscription).
      if (res.requiresIdentifier) {
        setIdentifierNotice(res.message ?? null);
        return;
      }
      // Compte inexistant → page d'inscription (redirige ensuite vers le portail yowauth).
      if (res.requiresSignUp) {
        router.push('/auth/sign-up');
        return;
      }
      // Compte existant mais pas encore membre → écran « Rejoindre ».
      if (res.requiresJoin && res.pendingId) {
        setJoinStep({ pendingId: res.pendingId, email: res.email ?? email.trim() });
        setJoinState('idle');
        return;
      }
      await finishLogin(res);
    } catch (err) {
      if (err instanceof BffApiError && err.status === 429) {
        setGlobalError('Trop de tentatives de connexion. Veuillez réessayer dans une minute.');
      } else if (err instanceof BffApiError && err.status === 401) {
        setGlobalError('Email ou mot de passe incorrect.');
      } else {
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinStep || joinState === 'sending' || !termsAccepted) return;
    setJoinState('sending');
    try {
      await apiFetch('/api/auth/login/join', {
        method: 'POST',
        body: {
          pendingId: joinStep.pendingId,
          acceptedTerms: { version: '1.0', acceptedAt: new Date().toISOString() },
        },
      });
      setJoinState('sent');
    } catch {
      setJoinState('error');
    }
  }

  const inputBase =
    'w-full px-4 py-3 rounded-[10px] text-[15px] outline-none transition-all duration-200 bg-white';
  const inputStyle = (hasError?: boolean) =>
    `${inputBase} ${hasError ? 'border-2 border-red-400 shadow-[0_0_0_4px_rgba(239,68,68,.08)]' : 'border-[1.5px] border-gray-200 focus:border-[#1F5FBF] focus:shadow-[0_0_0_4px_rgba(31,95,191,.08)]'}`;

  // Étape « Identifiant Yowyob envoyé » — l'email n'est plus un identifiant de connexion ; KSM
  // vient d'envoyer l'identifiant par email. On invite l'utilisateur à réessayer avec cet identifiant.
  if (identifierNotice !== null) {
    return (
      <AuthLayout
        headline={<>Bienvenue sur <span style={{ color: '#FF6B35' }}>Yowyob Education</span></>}
        sub="Connectez-vous avec votre identifiant Yowyob."
        showTestimonial={false}
      >
        <div className="w-full max-w-[420px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF3EC] border border-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] mb-6 shadow-sm mx-auto">
            <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
          <h2 className="font-display text-[24px] font-extrabold text-[#0F172A] mb-3">Vérifiez votre boîte mail</h2>
          <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
            {identifierNotice ||
              "Cette adresse n'est plus un identifiant de connexion. Nous venons de vous envoyer votre identifiant Yowyob par email."}{' '}
            Reconnectez-vous en saisissant cet <strong className="text-[#0F172A]">identifiant Yowyob</strong>.
          </p>
          <button
            type="button"
            onClick={() => { setIdentifierNotice(null); setEmail(''); setPassword(''); setGlobalError(null); }}
            className="w-full py-3 px-6 rounded-[10px] font-display font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] transition-all duration-200"
          >
            Retour à la connexion
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Étape « Rejoindre » — compte existant mais pas encore membre. « Rejoindre » émet l'invitation
  // (qui attribue le rôle lecteur) ; il suffit ensuite de se reconnecter pour entrer.
  if (joinStep) {
    return (
      <AuthLayout
        headline={<>Bienvenue sur <span style={{ color: '#FF6B35' }}>Yowyob Education</span></>}
        sub="Rejoignez la communauté pour accéder aux contenus."
        showTestimonial={false}
      >
        <div className="w-full max-w-[420px] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF3EC] border border-[#FF6B35]/20 flex items-center justify-center text-[#FF6B35] mb-6 shadow-sm mx-auto">
            <svg width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          {joinState === 'sent' ? (
            <>
              <h2 className="font-display text-[24px] font-extrabold text-[#0F172A] mb-3">Invitation envoyée 🎉</h2>
              <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
                Ouvrez le <strong className="text-[#0F172A]">lien d&apos;invitation reçu par email</strong> pour activer
                votre accès, puis reconnectez-vous.
              </p>
              <button
                type="button"
                onClick={() => { setJoinStep(null); setJoinState('idle'); setPassword(''); setGlobalError(null); setTermsAccepted(false); }}
                className="w-full py-3 px-6 rounded-[10px] font-display font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] transition-all duration-200"
              >
                Se reconnecter
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display text-[24px] font-extrabold text-[#0F172A] mb-3">Rejoindre Yowyob Education</h2>
              <p className="text-sm text-[#64748B] mb-6 leading-relaxed">
                Le compte <strong className="text-[#0F172A]">{joinStep.email}</strong> n&apos;a pas encore
                accès à Yowyob Education. Cliquez sur <strong>Rejoindre</strong> pour obtenir l&apos;accès.
              </p>
              <label className="flex items-start gap-2.5 text-left mb-5 text-xs text-[#475569] leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  aria-required="true"
                />
                <span>
                  J&apos;ai lu et j&apos;accepte les{' '}
                  <Link href="/legal/cgu" target="_blank" rel="noopener noreferrer" className="text-[#1F5FBF] underline hover:text-[#FF6B35]">
                    Conditions d&apos;utilisation
                  </Link>
                  , la{' '}
                  <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#1F5FBF] underline hover:text-[#FF6B35]">
                    Politique de confidentialité
                  </Link>{' '}
                  et la{' '}
                  <Link href="/legal/cookies" target="_blank" rel="noopener noreferrer" className="text-[#1F5FBF] underline hover:text-[#FF6B35]">
                    Notice Cookies
                  </Link>{' '}
                  de Yowyob Education.
                </span>
              </label>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinState === 'sending' || !termsAccepted}
                className="w-full py-3 px-6 rounded-[10px] font-display font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] disabled:opacity-60 transition-all duration-200"
              >
                {joinState === 'sending' ? 'En cours…' : 'Rejoindre'}
              </button>
              {joinState === 'error' && (
                <p className="text-xs text-red-500 mt-2">Échec. Réessayez ou reconnectez-vous.</p>
              )}
            </>
          )}
          <div className="mt-8 pt-6 border-t border-gray-100 w-full text-center">
            <button
              type="button"
              onClick={() => { setJoinStep(null); setJoinState('idle'); setGlobalError(null); setTermsAccepted(false); }}
              className="text-sm text-[#1F5FBF] font-medium hover:text-[#FF6B35] transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline={
        <>
          Rejoins <span style={{ color: '#FF6B35' }}>8&nbsp;500+</span>
          <br />apprenants qui<br />bâtissent l&apos;Afrique
        </>
      }
      sub="Articles, podcasts et cours créés par des experts africains — gratuit, sans engagement."
      showTestimonial={false}
    >
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <div className="mb-9">
            <h2 className="font-display text-[32px] font-extrabold text-[#0F172A] mb-2">
              Bon retour !
            </h2>
            <p className="text-[15px] text-[#64748B]">
              Pas encore de compte ?{' '}
              <Link href="/auth/sign-up" className="text-[#1F5FBF] font-semibold hover:text-[#FF6B35] transition-colors">
                Créer un compte gratuit
              </Link>
            </p>
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-3 mb-7">
            {[
              {
                label: 'Google',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                ),
              },
              {
                label: 'Apple',
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                ),
              },
            ].map(({ label, icon }) => (
              <SocialAuthButton key={label} label={label} icon={icon} />
            ))}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-7">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[13px] text-gray-400 whitespace-nowrap">ou se connecter par email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Global error */}
          {globalError && (
            <div className="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate aria-label="Formulaire de connexion">
            {/* Email */}
            <div className="mb-5">
              <label className="block font-display text-[13px] font-semibold text-[#0F172A] mb-2" htmlFor="email">
                Email ou identifiant Yowyob
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <path d="M22 6l-10 7L2 6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  onBlur={handleBlurEmail}
                  placeholder="votre@email.com ou identifiant Yowyob"
                  autoComplete="username"
                  required
                  aria-required="true"
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`${inputStyle(!!fieldErrors.email)} pl-11 font-body`}
                  style={{ color: '#0F172A' }}
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="font-display text-[13px] font-semibold text-[#0F172A]" htmlFor="password">
                  Mot de passe
                </label>
                <a href="#" className="text-[13px] text-[#1F5FBF] font-medium hover:text-[#FF6B35] transition-colors">
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                  onBlur={handleBlurPassword}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`${inputStyle(!!fieldErrors.password)} pl-11 pr-11 font-body`}
                  style={{ color: '#0F172A' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1F5FBF] transition-colors p-1 rounded"
                  aria-label="Afficher/masquer le mot de passe"
                  aria-pressed={showPwd}
                >
                  {showPwd ? (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <AuthButton type="submit" loading={loading}>
              {loading ? 'Connexion en cours…' : 'Se connecter'}
            </AuthButton>
          </form>

          {/* Register link */}
          <p className="text-center mt-6 text-sm text-[#64748B]">
            Nouveau sur YowYob Education ?{' '}
            <Link href="/auth/sign-up" className="text-[#1F5FBF] font-semibold hover:text-[#FF6B35] transition-colors">
              Créer un compte gratuit
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center mt-5 text-xs text-gray-400 leading-relaxed">
            En vous connectant, vous acceptez nos{' '}
            <Link href="/legal/cgu" target="_blank" rel="noopener noreferrer" className="text-gray-500 underline hover:text-[#1F5FBF] transition-colors">Conditions d&apos;utilisation</Link>{' '}
            et notre{' '}
            <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-500 underline hover:text-[#1F5FBF] transition-colors">Politique de confidentialité</Link>.
          </p>
        </div>
    </AuthLayout>
  );
}
