import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { provisionOwnerRole } from '@/server/ksm/admin-session';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { token?: string };
    const token = String(body.token ?? '').trim();
    if (!token) {
      return fail(400, 'VALIDATION_ERROR', 'token is required');
    }
    const result = await authApi.confirmEmailVerification(token);

    // Attribué ici (pas au sign-up) : dans le cas courant (vérification requise),
    // le userId n'est connu qu'à cette étape — et l'attribution doit précéder le
    // 1ᵉʳ login pour que le token de cet utilisateur porte déjà OWNER (nécessaire
    // pour créer son organisation freelance, cf. guide KSM).
    if (result.emailVerified) {
      await provisionOwnerRole(result.id);
    }

    return result;
  });
}
