import 'server-only';
import { redis } from '@/server/redis';

// Trace de consentement CGU/Confidentialité/Cookies, capturée au clic sur « Rejoindre » (avant même
// qu'une session BFF n'existe — cf. src/server/login-pending.ts). Keyée par email plutôt que par
// pendingId (éphémère, TTL 30-300s) car l'utilisateur ne revient réellement en session que plus tard,
// après avoir accepté l'invitation reçue par email. TTL long (2 ans) : simple registre de preuve, pas
// un verrou d'accès — son absence au login ne bloque rien (cf. login/route.ts).
export type TermsConsent = { version: string; acceptedAt: string };
const consentKey = (email: string) => `app:legal:consent:${email.toLowerCase()}`;
const TTL_SECONDS = 60 * 60 * 24 * 365 * 2;

export async function saveTermsConsent(email: string, consent: TermsConsent): Promise<void> {
  await redis().set(consentKey(email), JSON.stringify(consent), 'EX', TTL_SECONDS);
}

export async function getTermsConsent(email: string): Promise<TermsConsent | null> {
  const raw = await redis().get(consentKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TermsConsent;
  } catch {
    return null;
  }
}
