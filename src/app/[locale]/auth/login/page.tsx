'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { useSession } from '@/components/providers/session-provider';
import { AuthLeftPanel } from '@/components/auth/AuthLeftPanel';
import { isPlatformAdmin, isEducationEditor } from '@/lib/roles';

type LoginResult = {
  requiresOrgSelection?: boolean;
  pendingId?: string;
  organizations?: { organizationId: string; organizationCode?: string; displayName: string }[];
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
  // Étape « Choisir votre organisation » (login multi-orgs)
  const [orgStep, setOrgStep] = useState<{ pendingId: string; organizations: NonNullable<LoginResult['organizations']> } | null>(null);

  function validate() {
    const errs: typeof fieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Veuillez entrer une adresse email valide.';
    }
    if (password.length < 8) {
      errs.password = 'Le mot de passe doit comporter au moins 8 caractères.';
    }
    return errs;
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
        body: { email: email.trim().toLowerCase(), password },
      });
      if (res.requiresOrgSelection && res.pendingId && res.organizations?.length) {
        setOrgStep({ pendingId: res.pendingId, organizations: res.organizations });
        return;
      }
      await finishLogin(res);
    } catch (err) {
      if (err instanceof BffApiError && err.status === 401) {
        setGlobalError('Email ou mot de passe incorrect.');
      } else {
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
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

  async function handleSelectOrg(organizationId: string) {
    if (!orgStep || loading) return;
    setGlobalError(null);
    setLoading(true);
    try {
      const res = await apiFetch<LoginResult>('/api/auth/login/select-org', {
        method: 'POST',
        body: { pendingId: orgStep.pendingId, organizationId },
      });
      await finishLogin(res);
    } catch (err) {
      if (err instanceof BffApiError && err.status === 401) {
        // pendingId expiré : retour à l'étape identifiants
        setOrgStep(null);
        setGlobalError('La session de connexion a expiré. Veuillez vous reconnecter.');
      } else {
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputBase =
    'w-full px-4 py-3 rounded-[10px] text-[15px] outline-none transition-all duration-200 bg-white';
  const inputStyle = (hasError?: boolean) =>
    `${inputBase} ${hasError ? 'border-2 border-red-400 shadow-[0_0_0_4px_rgba(239,68,68,.08)]' : 'border-[1.5px] border-gray-200 focus:border-[#1565C0] focus:shadow-[0_0_0_4px_rgba(21,101,192,.08)]'}`;

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: '55% 45%' }}>
      <AuthLeftPanel
        kicker="Plateforme éducative africaine"
        headline={
          <>
            Rejoins <span style={{ background: 'linear-gradient(90deg,#FF6B35,#FFB347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>8&nbsp;500+</span>
            <br />apprenants qui<br />bâtissent l&apos;Afrique
          </>
        }
        sub="Articles, podcasts et cours créés par des experts africains — gratuit, sans engagement."
      />

      {/* Right panel */}
      <main
        className="bg-white flex items-center justify-center px-6 py-12 md:px-14 relative"
        role="main"
      >
        {/* Left border line */}
        <div
          className="hidden md:block absolute top-0 left-0 bottom-0 w-px pointer-events-none"
          style={{ background: 'linear-gradient(180deg,transparent,#E2E8F0 30%,#E2E8F0 70%,transparent)' }}
        />

        {/* Mobile logo */}
        <div className="md:hidden absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[9px] flex items-center justify-center font-display font-extrabold text-sm text-white"
            style={{ background: 'linear-gradient(135deg,#1565C0,#FF6B35)' }}
          >
            YN
          </div>
          <span className="font-display text-xl font-extrabold">
            <span className="text-[#0F3460]">Yow</span>
            <span style={{ color: '#FF6B35' }}>News</span>
          </span>
        </div>

        <div className="w-full max-w-[400px]">
          {orgStep ? (
            <div>
              <div className="mb-8">
                <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-2">
                  Choisir votre organisation
                </h2>
                <p className="text-[15px] text-[#64748B]">
                  Votre compte est rattaché à plusieurs organisations. Sélectionnez celle avec laquelle vous souhaitez continuer.
                </p>
              </div>
              {globalError && (
                <div className="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-600">
                  {globalError}
                </div>
              )}
              <div className="flex flex-col gap-3" role="list" aria-label="Vos organisations">
                {orgStep.organizations.map((org) => (
                  <button
                    key={org.organizationId}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectOrg(org.organizationId)}
                    className="flex items-center gap-3 w-full text-left px-4 py-3.5 rounded-[10px] border-[1.5px] border-gray-200 bg-white transition-all duration-200 hover:border-[#1565C0] hover:shadow-[0_0_0_4px_rgba(21,101,192,.08)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span
                      className="w-10 h-10 rounded-[9px] flex items-center justify-center font-display font-bold text-sm text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg,#1565C0,#FF6B35)' }}
                    >
                      {org.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-[#0F172A] truncate">{org.displayName}</span>
                      {org.organizationCode && (
                        <span className="block text-xs text-[#64748B] truncate">{org.organizationCode}</span>
                      )}
                    </span>
                    <svg className="ml-auto shrink-0 text-gray-400" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setOrgStep(null); setGlobalError(null); }}
                className="mt-6 text-sm text-[#1565C0] font-medium hover:text-[#FF6B35] transition-colors"
              >
               Utiliser un autre compte
              </button>
            </div>
          ) : (
          <>
          {/* Header */}
          <div className="mb-9">
            <h2 className="font-display text-[32px] font-extrabold text-[#0F172A] mb-2">
              Bon retour ! 
            </h2>
            <p className="text-[15px] text-[#64748B]">
              Pas encore de compte ?{' '}
              <Link href="/auth/sign-up" className="text-[#1565C0] font-semibold hover:text-[#FF6B35] transition-colors">
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
              <button
                key={label}
                type="button"
                disabled
                className="flex items-center justify-center gap-2.5 py-[11px] px-5 rounded-[10px] border-[1.5px] border-gray-200 bg-white text-sm font-medium text-[#0F172A] transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Continuer avec ${label}`}
              >
                {icon}
                {label}
              </button>
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
                Adresse email
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
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="votre@email.com"
                  autoComplete="email"
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
                <a href="#" className="text-[13px] text-[#1565C0] font-medium hover:text-[#FF6B35] transition-colors">
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1565C0] transition-colors p-1 rounded"
                  aria-label="Afficher/masquer le mot de passe"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-[10px] text-white font-display text-base font-bold transition-all duration-300 relative overflow-hidden disabled:opacity-80"
              style={{
                background: loading ? '#FF6B35' : '#FF6B35',
                boxShadow: loading ? 'none' : undefined,
              }}
              onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.background = '#E55A2B'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(255,107,53,.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FF6B35'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connexion en cours…
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center mt-6 text-sm text-[#64748B]">
            Nouveau sur YowNews ?{' '}
            <Link href="/auth/sign-up" className="text-[#1565C0] font-semibold hover:text-[#FF6B35] transition-colors">
              Créer un compte gratuit 
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center mt-5 text-xs text-gray-400 leading-relaxed">
            En vous connectant, vous acceptez nos{' '}
            <a href="#" className="text-gray-500 underline hover:text-[#1565C0] transition-colors">Conditions d&apos;utilisation</a>{' '}
            et notre{' '}
            <a href="#" className="text-gray-500 underline hover:text-[#1565C0] transition-colors">Politique de confidentialité</a>.
          </p>
          </>
          )}
        </div>
      </main>
    </div>
  );
}
