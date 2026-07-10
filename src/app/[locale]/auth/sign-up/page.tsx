'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from '@/i18n/navigation';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { useSession } from '@/components/providers/session-provider';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthButton, SocialAuthButton } from '@/components/auth/AuthButton';
import { CountryCodeSelect } from '@/components/auth/CountryCodeSelect';

function scorePassword(p: string): 0 | 1 | 2 | 3 | 4 {
  if (!p) return 0;
  if (p.length < 5) return 1;
  if (p.length < 8) return 2;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(4, s) as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABELS: Record<number, { text: string; color: string }> = {
  0: { text: '', color: '' },
  1: { text: 'Trop court', color: '#EF4444' },
  2: { text: 'Faible', color: '#F59E0B' },
  3: { text: 'Moyen', color: '#65A30D' },
  4: { text: 'Fort 💪', color: '#22C55E' },
};

const BAR_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F59E0B',
  3: '#84CC16',
  4: '#22C55E',
};

// Bleu de la landing page (--b600 dans landingStyles.ts, couleur de la nav), en aplat — jamais en dégradé.
const LANDING_BLUE = '#1F5FBF';

export default function SignUpPage() {
  const router = useRouter();
  const { refresh } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [countryCode, setCountryCode] = useState('+237');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'organization'>('individual');
  const [orgCode, setOrgCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'firstName' | 'lastName' | 'username' | 'email' | 'password', string>>>({});

  const pwScore = scorePassword(password);
  const strength = STRENGTH_LABELS[pwScore];

  function clearErr(field: keyof typeof fieldErrors) {
    setFieldErrors((p) => ({ ...p, [field]: undefined }));
  }

  // Étape 1 : identité (nom/prénom/username en particulier, code en organisation).
  function validateStep1() {
    const errs: typeof fieldErrors = {};
    if (accountType === 'individual') {
      if (!firstName.trim()) errs.firstName = 'Requis';
      if (!lastName.trim()) errs.lastName = 'Requis';
      if (!username.trim()) errs.username = 'Requis';
    }
    return errs;
  }

  // Étape 2 : identifiants de connexion.
  function validateStep2() {
    const errs: typeof fieldErrors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Adresse email invalide';
    if (password.length < 8) errs.password = 'Minimum 8 caractères';
    return errs;
  }

  function validate() {
    return { ...validateStep1(), ...validateStep2() };
  }

  // Validation au blur : signale l'erreur dès que l'utilisateur quitte un champ invalide,
  // au lieu d'attendre la validation d'étape (heuristique de Nielsen n°9 — prévention des erreurs).
  function handleBlur(field: keyof typeof fieldErrors, hasValue: boolean) {
    if (!hasValue) return;
    setFieldErrors((p) => ({ ...p, [field]: validate()[field] }));
  }

  function handleNext() {
    const errs = validateStep1();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setStep(2);
  }

  function handleBack() {
    setFieldErrors({});
    setGlobalError(null);
    setStep(1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setGlobalError(null);
    setLoading(true);
    try {
      const phoneNumber = phone.trim() ? `${countryCode}${phone.trim()}` : undefined;
      const res = await apiFetch<{
        accountMode?: 'individual' | 'organization';
        emailVerificationRequired?: boolean;
        email?: string;
      }>('/api/auth/sign-up', {
        method: 'POST',
        body: {
          firstName: accountType === 'individual' ? firstName.trim() : 'Représentant',
          lastName: accountType === 'individual' ? lastName.trim() : 'Organisation',
          username: accountType === 'individual' ? username.trim() : email.trim().toLowerCase().split('@')[0],
          email: email.trim().toLowerCase(),
          password,
          phoneNumber,
          accountType,
          orgCode: accountType === 'organization' ? orgCode.trim() : undefined,
        },
      });
      if (res.emailVerificationRequired) {
        setEmailVerificationRequired(res.email ?? email.trim().toLowerCase());
        return;
      }
      await refresh();
      router.push(res.accountMode === 'organization' ? '/auth/org-onboarding' : '/');
    } catch (err) {
      if (err instanceof BffApiError) {
        if (err.status === 409) {
          setFieldErrors({ email: 'Cette adresse email est déjà utilisée.' });
        } else if (err.status === 404) {
          setGlobalError("L'organisation n'existe pas dans KSM. Inscription en tant que particulier requise.");
          setAccountType('individual');
          setStep(1);
        } else {
          setGlobalError(err.message || 'Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setGlobalError('Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputBase = 'w-full px-3.5 py-[11px] rounded-[10px] text-sm outline-none transition-all duration-200 bg-white font-body';
  const inputCls = (hasError?: boolean, hasSuccess?: boolean) =>
    `${inputBase} ${
      hasError
        ? 'border-2 border-red-400 shadow-[0_0_0_3px_rgba(239,68,68,.08)]'
        : hasSuccess
          ? 'border-[1.5px] border-green-400 shadow-[0_0_0_3px_rgba(34,197,94,.08)]'
          : 'border-[1.5px] border-gray-200 focus:border-[#1F5FBF] focus:shadow-[0_0_0_3px_rgba(31,95,191,.08)]'
    }`;

  if (emailVerificationRequired) {
    return (
      <AuthLayout
        headline={<>Presque prêt·e 📬</>}
        sub="Il ne reste qu'une étape avant d'accéder à tes articles, podcasts et cours."
        showTestimonial={false}
      >
          <div className="w-full max-w-[420px] text-center">
            <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-3">
              Vérifie ta boîte mail ✉️
            </h2>
            <p className="text-sm text-[#64748B] mb-6">
              Nous avons envoyé un lien de confirmation à{' '}
              <span className="font-semibold text-[#0F172A]">{emailVerificationRequired}</span>.
              Clique dessus pour activer ton compte, puis connecte-toi.
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-5 py-3 rounded-[10px] font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] transition-colors"
            >
              Aller à la connexion
            </Link>
          </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      headline={
        <>
          Crée ton compte,<br />rejoins{' '}
          <span style={{ color: '#FF6B35' }}>8&nbsp;500+</span>
          <br />apprenants africains
        </>
      }
      sub="Accède à des centaines d'articles, podcasts et cours créés par des experts africains. 100% gratuit."
      showTestimonial={false}
    >
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="mb-6">
            <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-1.5">
              Créer mon compte
            </h2>
            <p className="text-sm text-[#64748B]">
              Déjà membre ?{' '}
              <Link href="/auth/login" className="text-[#1F5FBF] font-semibold hover:text-[#FF6B35] transition-colors">
                Se connecter
              </Link>
            </p>
          </div>

          {/* Indicateur d'étapes — gris (à venir) → bleu landing (en cours) → vert (étape terminée) */}
          <div className="flex items-center gap-2 mb-6" role="list" aria-label="Progression de l'inscription">
            {[1, 2].map((s) => (
              <div key={s} className="flex-1 flex items-center gap-2" role="listitem">
                <span
                  className="h-1.5 flex-1 rounded-full transition-colors duration-200"
                  style={{ background: s < step ? '#22C55E' : s === step ? LANDING_BLUE : '#E2E8F0' }}
                />
              </div>
            ))}
          </div>
         

          {step === 1 && (
            <>
              {/* Social buttons */}
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {[
                  { label: 'Google', icon: <svg width="17" height="17" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
                  { label: 'Apple', icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> },
                ].map(({ label, icon }) => (
                  <SocialAuthButton key={label} label={label} icon={icon} />
                ))}
              </div>
              <div className="flex items-center gap-2.5 mb-6">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 whitespace-nowrap">ou s&apos;inscrire par email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {globalError && (
                <div className="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {globalError}
                </div>
              )}

              {/* Type de compte */}
              <div className="mb-5">
                <p className="font-display text-xs font-semibold text-[#0F172A] mb-2">Type de compte</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    {
                      value: 'individual' as const,
                      name: 'Particulier',
                      desc: 'Usage personnel',
                      icon: (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                        </svg>
                      ),
                    },
                    {
                      value: 'organization' as const,
                      name: 'Organisation',
                      desc: 'Équipe / Entreprise',
                      icon: (
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                          <path d="M9 22V12h6v10"/>
                        </svg>
                      ),
                    },
                  ].map((opt) => {
                    const selected = accountType === opt.value;
                    return (
                      <label
                        key={opt.value}
                        htmlFor={`acct-${opt.value}`}
                        className="relative flex flex-col items-center gap-2 p-3.5 rounded-[12px] cursor-pointer transition-all duration-200 text-center"
                        style={{
                          border: selected ? '2px solid #FF6B35' : '2px solid #E2E8F0',
                          background: selected ? '#FFF3EC' : '#fff',
                          boxShadow: selected ? '0 0 0 3px rgba(255,107,53,.1)' : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          id={`acct-${opt.value}`}
                          name="acctType"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setAccountType(opt.value)}
                          className="absolute opacity-0 w-0 h-0"
                        />
                        <div
                          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all"
                          style={{
                            background: selected ? 'rgba(255,107,53,.15)' : '#F1F5F9',
                            color: selected ? '#FF6B35' : '#94A3B8',
                          }}
                        >
                          {opt.icon}
                        </div>
                        <div>
                          <div className="font-display text-[13px] font-bold text-[#0F172A]">{opt.name}</div>
                          <div className="text-[11px] text-[#64748B]">{opt.desc}</div>
                        </div>
                        {selected && (
                          <div
                            className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full flex items-center justify-center"
                            style={{ background: '#FF6B35' }}
                          >
                            <svg width="10" height="10" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          </div>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {accountType === 'individual' ? (
                <>
                  {/* Name row */}
                  <div className="grid grid-cols-2 gap-3 mb-3.5">
                    {[
                      { id: 'firstName', label: 'Prénom', value: firstName, setter: setFirstName, placeholder: 'Kwame', autocomplete: 'given-name' },
                      { id: 'lastName', label: 'Nom', value: lastName, setter: setLastName, placeholder: 'Asante', autocomplete: 'family-name' },
                    ].map(({ id, label, value, setter, placeholder, autocomplete }) => (
                      <div key={id}>
                        <label htmlFor={id} className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">{label}</label>
                        <input
                          id={id}
                          type="text"
                          value={value}
                          onChange={(e) => { setter(e.target.value); clearErr(id as 'firstName' | 'lastName'); }}
                          onBlur={() => handleBlur(id as 'firstName' | 'lastName', value.trim().length > 0)}
                          placeholder={placeholder}
                          autoComplete={autocomplete}
                          required
                          className={inputCls(!!fieldErrors[id as 'firstName' | 'lastName'], !fieldErrors[id as 'firstName' | 'lastName'] && value.trim().length > 0)}
                          style={{ color: '#0F172A' }}
                        />
                        {fieldErrors[id as 'firstName' | 'lastName'] && (
                          <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            {fieldErrors[id as 'firstName' | 'lastName']}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Username */}
                  <div className="mb-6">
                    <label htmlFor="username" className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">Nom d&apos;utilisateur</label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); clearErr('username'); }}
                      onBlur={() => handleBlur('username', username.trim().length > 0)}
                      placeholder="kwame_asante"
                      autoComplete="username"
                      required
                      className={inputCls(!!fieldErrors.username, !fieldErrors.username && username.trim().length > 0)}
                      style={{ color: '#0F172A' }}
                    />
                    {fieldErrors.username && (
                      <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {fieldErrors.username}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="mb-6">
                  <label htmlFor="orgCode" className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">
                    Code de l&apos;organisation
                  </label>
                  <input
                    id="orgCode"
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value)}
                    placeholder="EXEMPLE_ORG"
                    className={inputCls()}
                    style={{ color: '#0F172A' }}
                  />
                  <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                    Si cette organisation est déjà créée dans KSM, entrez son code pour vous y rattacher. Sinon, laissez vide pour créer un compte classique.
                  </p>
                </div>
              )}

              <AuthButton type="button" onClick={handleNext}>
                Continuer
              </AuthButton>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} noValidate aria-label="Formulaire d'inscription">
              {globalError && (
                <div className="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {globalError}
                </div>
              )}

              {/* Email */}
              <div className="mb-3.5">
                <label htmlFor="email" className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">Adresse email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearErr('email'); }}
                  onBlur={() => handleBlur('email', email.trim().length > 0)}
                  placeholder="kwame@exemple.com"
                  autoComplete="email"
                  required
                  autoFocus
                  className={inputCls(!!fieldErrors.email, !fieldErrors.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))}
                  style={{ color: '#0F172A' }}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password + strength */}
              <div className="mb-3.5">
                <label htmlFor="password" className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearErr('password'); }}
                    onBlur={() => handleBlur('password', password.length > 0)}
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                    required
                    className={`${inputCls(!!fieldErrors.password)} pr-10`}
                    style={{ color: '#0F172A' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1F5FBF] transition-colors p-1 flex items-center"
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
                {/* Strength bars */}
                {password.length > 0 && (
                  <div className="mt-2" aria-live="polite">
                    <div className="grid grid-cols-4 gap-1 mb-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-1 rounded-sm transition-all duration-300"
                          style={{ background: i <= pwScore ? BAR_COLORS[pwScore] : '#E2E8F0' }}
                        />
                      ))}
                    </div>
                    {strength.text && (
                      <span className="text-[11px] font-display font-semibold" style={{ color: strength.color }}>
                        {strength.text}
                      </span>
                    )}
                  </div>
                )}
                {fieldErrors.password && (
                  <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Phone (optional) */}
              {accountType === 'individual' && (
                <div className="mb-6">
                  <label htmlFor="phone" className="block font-display text-xs font-semibold text-[#0F172A] mb-1.5">
                    Téléphone <span className="text-gray-400 font-normal text-[11px] ml-1">(optionnel)</span>
                  </label>
                  <div className="flex">
                    <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07 00 00 00 00"
                      autoComplete="tel-national"
                      aria-label="Numéro de téléphone"
                      className="flex-1 px-3.5 py-[11px] rounded-r-[10px] border-[1.5px] border-l-0 border-gray-200 bg-white text-sm text-[#0F172A] outline-none focus:border-[#1F5FBF] transition-all"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-400 flex items-center gap-1">
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                    Pour recevoir des alertes importantes
                  </p>
                </div>
              )}

              <p className="text-center mb-4 text-[11px] text-gray-400 leading-relaxed">
                En vous inscrivant, vous acceptez nos{' '}
                <a href="#" className="text-gray-500 underline hover:text-[#1F5FBF] transition-colors">Conditions d&apos;utilisation</a>{' '}
                et notre{' '}
                <a href="#" className="text-gray-500 underline hover:text-[#1F5FBF] transition-colors">Politique de confidentialité</a>.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="shrink-0 px-4 py-[15px] rounded-[10px] border-[1.5px] border-gray-200 text-sm font-display font-semibold text-[#0F172A] hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <div className="flex-1">
                  <AuthButton type="submit" loading={loading}>
                    {loading ? 'Création en cours…' : 'Créer mon compte'}
                  </AuthButton>
                </div>
              </div>
            </form>
          )}
        </div>
    </AuthLayout>
  );
}
