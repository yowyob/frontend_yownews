import 'server-only';
import { serverEnv } from '@/env';
import { redis } from '@/server/redis';
import { logger } from '@/server/logger';
import type { AppSession } from '@/lib/types/auth';

// Appel HTTP direct à KSM (pas callKsm/modules/auth.ts) : callKsm importe ce module indirectement
// pour son propre retry sur 401, donc passer par modules/auth.ts créerait un cycle d'import
// (client.ts → token-refresh.ts → modules/auth.ts → client.ts). session.ts importe aussi ce
// module pour son rafraîchissement proactif — les deux partagent ainsi le même verrou.

type RefreshTokensResponse = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInSeconds: number;
  refreshExpiresInSeconds: number;
};

const key = (sid: string) => `app:session:${sid}`;

// KSM fait de la rotation de refresh token (usage unique) : sans dé-duplication, des requêtes
// concurrentes en fin de vie de l'accessToken liraient le même refreshToken et tenteraient toutes
// de le consommer — une seule gagnerait, les autres recevraient AUTH_INVALID_REFRESH_TOKEN, ce qui
// supprimait jusqu'ici toute la session (déconnexion forcée) sur ce qui n'était qu'une course perdue
// (cf. plan, cause #2, confirmée en live). Une promesse en cours partagée par sid élimine la course :
// un seul appel réseau réel par sid à la fois sur cette instance.
const refreshInFlight = new Map<string, Promise<AppSession | null>>();

export async function refreshAccessToken(sid: string, session: AppSession): Promise<AppSession | null> {
  if (!session.refreshToken) return null;
  const pending = refreshInFlight.get(sid);
  if (pending) return pending;
  const promise = performRefresh(sid, session).finally(() => {
    refreshInFlight.delete(sid);
  });
  refreshInFlight.set(sid, promise);
  return promise;
}

async function performRefresh(sid: string, session: AppSession): Promise<AppSession | null> {
  try {
    const res = await fetch(`${serverEnv.KSM_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Client-Id': serverEnv.KSM_CLIENT_ID,
        'X-Api-Key': serverEnv.KSM_API_KEY,
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`ksm refresh failed: ${res.status} ${text}`);
    }
    const result = JSON.parse(text) as RefreshTokensResponse;
    const next: AppSession = {
      ...session,
      accessToken: result.accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + result.accessExpiresInSeconds,
      refreshToken: result.refreshToken,
      refreshExpiresAt: Math.floor(Date.now() / 1000) + result.refreshExpiresInSeconds,
    };
    await redis().set(key(sid), JSON.stringify(next), 'EX', serverEnv.SESSION_TTL_SECONDS);
    return next;
  } catch (cause) {
    // Refresh token lui-même expiré/révoqué (ou toute autre erreur définitive maintenant que la
    // course est éliminée par le verrou ci-dessus) : vraie déconnexion, légitime.
    logger.warn({ cause }, 'session.refresh_failed');
    return null;
  }
}
