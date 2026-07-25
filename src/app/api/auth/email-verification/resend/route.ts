import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { getAdminSession } from '@/server/ksm/admin-session';

// POST /api/auth/email-verification/resend — renvoie le lien de vérification (bouton « Renvoyer »
// de l'écran de connexion). KSM exige un X-Tenant-Id : les comptes utilisateurs vivent dans le
// tenant plateforme, donc on réutilise le tenant de la session admin de service.
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { principal?: string };
    const principal = String(body.principal ?? '').trim().toLowerCase();
    if (!principal) return fail(400, 'VALIDATION_ERROR', 'principal is required');

    const admin = await getAdminSession();
    await authApi.resendEmailVerification(principal, admin?.user.tenantId);
    return { ok: true as const };
  });
}
