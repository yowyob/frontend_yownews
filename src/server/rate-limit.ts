import 'server-only';
import { redis } from '@/server/redis';
import { logger } from '@/server/logger';

/**
 * Rate-limit très simple par IP (fenêtre fixe) via Redis : `INCR` + `EXPIRE`. Remplace le captcha
 * de connexion — objectif : freiner le bourrage d'identifiants automatisé.
 *
 * Repli **« autorisé »** si Redis est indisponible : on ne bloque jamais un login légitime sur une
 * panne d'infrastructure (le rate-limit est une défense de confort, pas une barrière d'auth).
 */
export async function allowLoginAttempt(ip: string, limit = 5, windowSeconds = 60): Promise<boolean> {
  if (!ip) return true; // pas d'IP résolue → on n'a rien pour limiter, on laisse passer
  try {
    const k = `login:rl:${ip}`;
    const n = await redis().incr(k);
    if (n === 1) await redis().expire(k, windowSeconds);
    return n <= limit;
  } catch (cause) {
    logger.error({ cause }, 'auth.login.rate_limit_unavailable');
    return true;
  }
}

/** Résout l'IP cliente derrière un proxy (x-forwarded-for en priorité, puis x-real-ip). */
export function clientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? '';
  return request.headers.get('x-real-ip')?.trim() ?? '';
}
