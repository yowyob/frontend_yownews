'use client';
import { ReactNode } from 'react';

function Spinner({ size = 18 }: { size?: number }) {
  return (
    <svg className="animate-spin shrink-0" width={size} height={size} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type PrimaryProps = {
  children: ReactNode;
  type?: 'button' | 'submit';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
};

/** Bouton d'action principal (submit des formulaires d'auth) — un seul style, partagé entre login/sign-up. */
export function AuthButton({ children, type = 'button', loading, disabled, onClick }: PrimaryProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="w-full inline-flex items-center justify-center gap-2.5 py-[15px] rounded-[10px] text-white font-display text-[15px] font-bold bg-[#FF6B35] transition-all duration-200 hover:bg-[#E55A2B] hover:shadow-[0_8px_28px_rgba(255,107,53,.4)] hover:-translate-y-px disabled:opacity-75 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
    >
      {loading && <Spinner size={18} />}
      {children}
    </button>
  );
}

type SocialProps = {
  label: string;
  icon: ReactNode;
};

/**
 * Bouton de connexion sociale — fonctionnalité prévue mais pas encore branchée côté backend.
 * Reste visible dans la mise en page (le socle graphique est prêt), grisé/désactivé pour
 * signaler clairement qu'il n'est pas encore actif.
 */
export function SocialAuthButton({ label, icon }: SocialProps) {
  return (
    <button
      type="button"
      disabled
      aria-label={`Continuer avec ${label} (indisponible)`}
      className="flex items-center justify-center gap-2.5 py-[11px] px-4 rounded-[10px] border-[1.5px] border-gray-200 bg-gray-50 text-sm font-medium text-gray-400 font-body opacity-70 cursor-not-allowed"
    >
      <span className="grayscale opacity-60">{icon}</span>
      {label}
    </button>
  );
}

export { Spinner };
