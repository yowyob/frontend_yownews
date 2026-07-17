import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, orgDisplayName, savePendingLogin } from '@/server/login-pending';
import { ensureFreelanceOrganization, ensureOrgServicesSubscribed } from '@/server/ksm/freelance-org';
import { provisionOwnerRole, ensureServiceRolesSelf, type EntitlementLevel } from '@/server/ksm/admin-session';
import { getMyApplication } from '@/server/ksm/modules/editor-applications';
import { logger } from '@/server/logger';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { email?: string; password?: string };
    const principal = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!principal || !password) {
      return fail(400, 'VALIDATION_ERROR', 'email and password are required');
    }

    const discovery = await authApi.discoverContexts(principal, password);

    if (!discovery.contexts.length) {
      return fail(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const ctx = discovery.contexts[0];
    const orgs = ctx.organizations ?? [];

    // Plusieurs organisations : étape « Choisir votre organisation » côté client.
    // Le selectionToken KSM reste en Redis ; seul un pendingId opaque sort.
    if (orgs.length > 1) {
      const pendingId = await savePendingLogin(
        { selectionToken: discovery.selectionToken, contextId: ctx.contextId, organizations: orgs },
        discovery.expiresInSeconds,
      );
      return {
        requiresOrgSelection: true as const,
        pendingId,
        organizations: orgs.map((o) => ({
          organizationId: o.organizationId,
          organizationCode: o.organizationCode,
          displayName: orgDisplayName(o),
        })),
      };
    }

    // 0 org (lecteur / staff plateforme) : fallback org plateforme inchangé.
    // 1 org : auto-sélection, validée nativement par KSM (validateOrganizationAccess).
    const orgId = orgs[0]?.organizationId ?? undefined;
    let contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    let session = buildSession(contextual);

    // Re-login frais (mêmes identifiants) pour obtenir un token reflétant les rôles/orgs attribués
    // après l'émission du token initial — KSM ne reflète jamais un rôle assigné après coup dans un
    // token déjà émis, mais un nouveau select-context relit les rôles courants en base.
    async function freshLogin(preferOrgId?: string): Promise<void> {
      try {
        const d = await authApi.discoverContexts(principal, password);
        const c = d.contexts[0];
        if (!c) return;
        const target =
          preferOrgId ??
          c.organizations.find((o) => o.organizationId === orgId)?.organizationId ??
          c.organizations[0]?.organizationId ??
          undefined;
        contextual = await authApi.selectContext(d.selectionToken, c.contextId, target);
        session = buildSession(contextual);
      } catch (cause) {
        logger.error({ cause }, 'auth.login.fresh_login_failed');
      }
    }

    // Matérialise, sur l'org de l'utilisateur, les rôles de service correspondant à son niveau
    // d'habilitation (lecteur par défaut, rédacteur si candidature approuvée). Seul l'utilisateur —
    // OWNER de son org — peut le faire (l'admin n'est pas membre de son org freelance → 401) ; d'où
    // l'auto-attribution via `session`. Cf. docs/service-role-provisioning.md.
    async function materializeServiceRoles(targetOrgId: string): Promise<void> {
      let level: EntitlementLevel = 'reader';
      try {
        const application = await getMyApplication(session);
        if (application?.status === 'APPROVED') level = 'editor';
      } catch (cause) {
        logger.error({ cause }, 'auth.login.entitlement_level_failed');
      }
      const changed = await ensureServiceRolesSelf(session, targetOrgId, level);
      if (changed) await freshLogin(targetOrgId); // ré-émet le token avec les rôles fraîchement posés
    }

    if (orgs.length === 0) {
      // 0 org : ce compte n'a jamais reçu le rôle OWNER (le lien de vérification email pointe vers
      // KSM lui-même, cf. IWM_AUTH_EMAIL_PUBLIC_BASE_URL — le confirm route du BFF n'est jamais
      // traversé). On l'attribue, on rafraîchit le token (pour porter tenant:admin), puis on crée
      // l'organisation freelance (+ owner roles + souscription services).
      await provisionOwnerRole(session.user.id);
      await freshLogin();
      await ensureFreelanceOrganization(session, {
        email: session.user.email,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        username: session.user.username,
      });
      // L'org freelance est maintenant l'unique org du lecteur : on re-login pour se placer dans son
      // contexte, puis on matérialise ses rôles de service dessus (sans quoi le feed renvoie 500
      // AccessDenied) — dès le PREMIER login, pas seulement les suivants.
      await freshLogin();
      const freelanceOrgId = contextual.selectedOrganizationId ?? undefined;
      if (freelanceOrgId) await materializeServiceRoles(freelanceOrgId);
    } else if (orgId) {
      // 1 org déjà existante : auto-répare une souscription services incomplète, puis matérialise
      // les rôles de service manquants pour le niveau de l'utilisateur (self-heal des comptes créés
      // avant ce mécanisme, et bascule lecteur→rédacteur après approbation).
      await ensureOrgServicesSubscribed(session, orgId, orgs[0]?.services ?? []);
      await materializeServiceRoles(orgId);
    }

    await writeSession(session);

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
