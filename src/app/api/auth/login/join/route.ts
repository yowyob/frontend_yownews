import 'server-only';
import type { NextRequest } from 'next/server';
import { HttpError } from '@/lib/types/api';
import { handleRoute, fail } from '@/server/api-response';
import { takeJoinPending } from '@/server/login-pending';
import { saveTermsConsent, type TermsConsent } from '@/server/terms-consent';
import { getAdminSession, getReaderRoleId, provisionNewsletterReaderRole, provisionReaderRoles } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { inviteEmployee } from '@/server/ksm/modules/employees';
import { logger } from '@/server/logger';

// POST /api/auth/login/join { pendingId, acceptedTerms } — « Rejoindre Yowyob Education ».
// Émet une invitation dans l'org plateforme (via l'identité admin, propriétaire de l'org) : KSM crée
// l'adhésion et attribue immédiatement le rôle lecteur, puis envoie un email. Il suffit ensuite à
// l'utilisateur de se reconnecter — l'org apparaît alors dans ses accès et il entre.
//
// C'est le point « première connexion, aucun rôle sur la plateforme » : le rôle lecteur n'existe pas
// avant cette invitation. L'acceptation des CGU/Confidentialité/Cookies est donc exigée ICI, avant
// l'attribution du rôle — pas un simple flag optionnel côté client (cf. src/server/terms-consent.ts).
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { pendingId?: string; acceptedTerms?: TermsConsent };
    const pendingId = String(body.pendingId ?? '');
    if (!pendingId) return fail(400, 'VALIDATION_ERROR', 'pendingId is required');
    const acceptedTerms = body.acceptedTerms;
    if (!acceptedTerms?.version || !acceptedTerms?.acceptedAt) {
      return fail(400, 'VALIDATION_ERROR', 'acceptedTerms is required');
    }

    const pending = await takeJoinPending(pendingId);
    if (!pending) {
      return fail(401, 'LOGIN_EXPIRED', 'La session de connexion a expiré. Veuillez vous reconnecter.');
    }

    const admin = await getAdminSession();
    if (!admin) return fail(503, 'ADMIN_UNAVAILABLE', 'Service indisponible, réessayez plus tard.');

    const [eduOrgId, readerRoleId] = await Promise.all([
      resolvePlatformOrganizationId(),
      getReaderRoleId(admin),
    ]);
    if (!eduOrgId) return fail(500, 'ORG_NOT_RESOLVED', 'Organisation Yowyob Education introuvable.');

    await saveTermsConsent(pending.email, acceptedTerms);

    try {
      await inviteEmployee(admin, eduOrgId, { email: pending.email, roleId: readerRoleId });
    } catch (err) {
      // Déjà invité/membre (409) → succès idempotent : l'accès est déjà en place. On retente quand
      // même l'attribution du rôle newsletter (best-effort) au cas où ce compte a été invité avant
      // que ce second rôle n'existe dans ce flux (résolution par email, pas de userId sous la main).
      if (err instanceof HttpError && err.status === 409) {
        await provisionReaderRoles(undefined, pending.email);
        return { invited: true as const };
      }
      logger.error({ err, email: pending.email }, 'auth.login.join_failed');
      throw err;
    }

    // KSM n'accepte qu'un seul roleId par invitation (inviteEmployee ci-dessus) : le rôle
    // NEWSLETTER_READER (permission newsletter:newsletter:subscribe/read) est donc attribué dans un
    // second appel, best-effort — ne doit jamais faire échouer l'invitation elle-même.
    await provisionNewsletterReaderRole(pending.email);

    return { invited: true as const };
  });
}
