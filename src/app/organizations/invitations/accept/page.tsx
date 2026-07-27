'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Page d'acceptation d'invitation — cible du lien reçu par email
// ({public-base-url}/organizations/invitations/accept?token=…). Route non localisée (segment statique
// hors [locale]) pour correspondre exactement au chemin construit par KSM. Lit le token dans l'URL et
// appelle le BFF (qui relaie vers l'API accept KSM) → l'adhésion passe PENDING → ACTIVE.
type State = 'loading' | 'success' | 'invalid' | 'error';

export default function AcceptInvitationPage() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let cancelled = false;
    // Tout le setState se fait dans l'IIFE async (jamais synchrone dans le corps de l'effet).
    (async () => {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) { if (!cancelled) setState('invalid'); return; }
      try {
        const res = await fetch('/api/org/invitations/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.ok) setState('success');
        else if (res.status === 400) setState('invalid');
        else setState('error');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const content: Record<State, { icon: string; accent: string; title: string; message: string }> = {
    loading: { icon: '⏳', accent: '#1F5FBF', title: 'Activation en cours…', message: 'Un instant, nous confirmons votre invitation.' },
    success: { icon: '✓', accent: '#16a34a', title: 'Accès confirmé', message: 'Vous faites désormais partie de Yowyob Education. Connectez-vous pour accéder à votre espace.' },
    invalid: { icon: '✗', accent: '#dc2626', title: 'Lien invalide ou expiré', message: 'Ce lien d’invitation n’est plus valide. Demandez une nouvelle invitation, ou reconnectez-vous et cliquez « Rejoindre ».' },
    error: { icon: '✗', accent: '#dc2626', title: 'Une erreur est survenue', message: 'Impossible de confirmer l’invitation pour le moment. Réessayez plus tard.' },
  };
  const c = content[state];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', padding: 24 }}>
      <div style={{ background: '#fff', maxWidth: 440, width: '100%', padding: '40px 32px', borderRadius: 16, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#fff', background: c.accent }}>
          {c.icon}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>{c.title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b', margin: '0 0 24px' }}>{c.message}</p>
        {state !== 'loading' && (
          <Link href="/auth/login" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: '#fff', background: '#FF6B35', textDecoration: 'none' }}>
            Aller à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}
