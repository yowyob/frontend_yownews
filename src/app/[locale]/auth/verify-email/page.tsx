'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, BffApiError } from '@/lib/api-client';
import { AuthLayout } from '@/components/auth/AuthLayout';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Lien de vérification invalide : le jeton est manquant.');
      return;
    }
    let cancelled = false;
    apiFetch('/api/auth/email-verification/confirm', { method: 'POST', body: { token } })
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch((e) => {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof BffApiError ? e.message : 'Ce lien de vérification est invalide ou a expiré.');
      });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthLayout
      headline={<>Vérification de ton email</>}
      sub="Encore un instant, on confirme ton adresse."
    >
        <div className="w-full max-w-[420px] text-center">
          {status === 'verifying' && (
            <>
              <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-3">Vérification en cours…</h2>
              <p className="text-sm text-[#64748B]">Merci de patienter quelques secondes.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-3">Email vérifié ✅</h2>
              <p className="text-sm text-[#64748B] mb-6">
                Ton compte est activé. Tu peux maintenant te connecter.
              </p>
              <Link
                href="/auth/login"
                className="inline-block px-5 py-3 rounded-[10px] font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] transition-colors"
              >
                Se connecter
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <h2 className="font-display text-[28px] font-extrabold text-[#0F172A] mb-3">Échec de la vérification</h2>
              <p className="text-sm text-[#64748B] mb-6">{error}</p>
              <Link
                href="/auth/sign-up"
                className="inline-block px-5 py-3 rounded-[10px] font-semibold text-sm text-white bg-[#FF6B35] hover:bg-[#E55A2B] transition-colors"
              >
                Retour à l&apos;inscription
              </Link>
            </>
          )}
        </div>
    </AuthLayout>
  );
}
