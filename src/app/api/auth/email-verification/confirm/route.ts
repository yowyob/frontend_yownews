import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { token?: string };
    const token = String(body.token ?? '').trim();
    if (!token) {
      return fail(400, 'VALIDATION_ERROR', 'token is required');
    }
    // Vérification email uniquement. Le rattachement à Yowyob Education se fait via « Rejoindre »
    // (invitation employé) au login, pas ici.
    return authApi.confirmEmailVerification(token);
  });
}
