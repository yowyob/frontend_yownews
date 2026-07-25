import 'server-only';
import type { NextRequest } from 'next/server';
import type { AppSession } from '@/lib/types/auth';
import { handleRoute, fail } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { writeSession } from '@/server/session';
import { buildSession, orgDisplayName, savePendingLogin, saveJoinPending } from '@/server/login-pending';
import { ensureOrgServicesSubscribed } from '@/server/ksm/freelance-org';
import { ensureServiceRolesSelf, type EntitlementLevel } from '@/server/ksm/admin-session';
import { getMyApplication } from '@/server/ksm/modules/editor-applications';
import { allowLoginAttempt, clientIp } from '@/server/rate-limit';
import { logger } from '@/server/logger';

// « Membre EDU » = le token porte déjà la permission lecteur éducation (rôle EDUCATION_READER de l'org
// plateforme). On teste la permission (éventuellement suffixée `#<orgId>`) plutôt que la liste d'orgs.
function hasEducationAccess(session: AppSession): boolean {
  const perms = session.user.permissions ?? session.user.roles ?? [];
  return perms.some((p) => p === 'education:content:read' || p.startsWith('education:content:read#'));
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as { email?: string; password?: string };
    const principal = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');

    if (!principal || !password) {
      return fail(400, 'VALIDATION_ERROR', 'email and password are required');
    }

    // Rate-limit par IP AVANT tout appel KSM (remplace le captcha) : freine le bourrage d'identifiants.
    if (!(await allowLoginAttempt(clientIp(request)))) {
      return fail(429, 'RATE_LIMITED', 'Trop de tentatives. Réessayez dans une minute.');
    }

    const discovery = await authApi.discoverContexts(principal, password);

    if (!discovery.contexts.length) {
      // discover-contexts renvoie une liste vide aussi bien pour un mauvais mot de passe que pour un
      // compte inexistant : on lève l'ambiguïté avec /identify pour router correctement.
      let accountExists = false;
      try {
        accountExists = (await authApi.identifyAccount(principal)).accountExists;
      } catch (cause) {
        logger.error({ cause }, 'auth.login.identify_failed');
      }
      if (accountExists) {
        return fail(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
      }
      // Pas de compte KSM → le client redirige vers la page d'inscription (→ yowauth).
      return { requiresSignUp: true as const };
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

    // 0 org (lecteur de l'org partagée Yowyob Education) : contexte plateforme par défaut.
    // 1 org : auto-sélection, validée nativement par KSM (validateOrganizationAccess).
    const orgId = orgs[0]?.organizationId ?? undefined;
    let contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    let session = buildSession(contextual);

    // Compte SANS accès Yowyob Education (ni org EDU, ni rôle lecteur) : on ne tente aucune attribution
    // au login (source de l'ancien 500). On propose de « Rejoindre » → invitation comme employé de
    // l'org EDU (cf. /api/auth/login/join). Les comptes sont créés email-vérifié sur yowauth, donc
    // aucune vérification email ici.
    if (!hasEducationAccess(session)) {
      const pendingId = await saveJoinPending({ email: session.user.email }, discovery.expiresInSeconds);
      return { requiresJoin: true as const, pendingId, email: session.user.email };
    }

    // Re-login frais (mêmes identifiants) pour refléter un rôle attribué après l'émission du token.
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

    // Matérialise, sur l'org de l'utilisateur (owner de son org), les rôles de service de son niveau
    // (lecteur, ou rédacteur si candidature approuvée). Cf. docs/service-role-provisioning.md.
    async function materializeServiceRoles(targetOrgId: string): Promise<void> {
      let level: EntitlementLevel = 'reader';
      try {
        const application = await getMyApplication(session);
        if (application?.status === 'APPROVED') level = 'editor';
      } catch (cause) {
        logger.error({ cause }, 'auth.login.entitlement_level_failed');
      }
      const changed = await ensureServiceRolesSelf(session, targetOrgId, level);
      if (changed) await freshLogin(targetOrgId);
    }

    if (orgId) {
      // Membre EDU disposant d'une org : auto-répare une souscription services incomplète, puis
      // matérialise les rôles de service manquants (self-heal + bascule lecteur→rédacteur).
      await ensureOrgServicesSubscribed(session, orgId, orgs[0]?.services ?? []);
      await materializeServiceRoles(orgId);
    }
    // 0 org + accès EDU : lecteur de l'org partagée déjà provisionné → rien à faire.

    await writeSession(session);

    return {
      user: session.user,
      workspace: session.workspace,
      forcePasswordChange: session.forcePasswordChange ?? false,
    };
  });
}
