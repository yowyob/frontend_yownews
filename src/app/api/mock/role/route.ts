import 'server-only';
import { cookies } from 'next/headers';
import { serverEnv } from '@/env';
import { handleRoute, fail } from '@/server/api-response';
import { MOCK_ROLE_COOKIE, type MockRole } from '@/server/mock-session';

const VALID_ROLES: MockRole[] = ['admin', 'editor', 'reader'];

// Bascule le rôle simulé par le sélecteur de la Topbar en MOCK_MODE — n'existe qu'en mode
// démo, la vraie authentification (production) ne passe jamais par cette route.
export async function POST(request: Request) {
  return handleRoute(async () => {
    if (!serverEnv.MOCK_MODE) return fail(404, 'NOT_FOUND', 'Mode mock désactivé.');

    const body = (await request.json()) as { role?: string };
    if (!VALID_ROLES.includes(body.role as MockRole)) {
      return fail(400, 'VALIDATION_ERROR', 'Rôle invalide.');
    }

    const store = await cookies();
    store.set(MOCK_ROLE_COOKIE, body.role as MockRole, { path: '/', httpOnly: false, sameSite: 'lax' });
    return { ok: true };
  });
}
