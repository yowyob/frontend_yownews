import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail, ok } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { inviteEmployee } from '@/server/ksm/modules/organization';
import { getAdminSession, provisionReaderRoles } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { writeSession } from '@/server/session';
import { logger } from '@/server/logger';
import type { AppSession } from '@/lib/types/auth';

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const body = (await request.json()) as {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      password?: string;
      phoneNumber?: string;
      accountType?: string;
      businessType?: string;
      orgCode?: string;
    };

    const firstName = String(body.firstName ?? '').trim();
    const lastName  = String(body.lastName  ?? '').trim();
    const username  = String(body.username  ?? '').trim();
    const email     = String(body.email     ?? '').trim().toLowerCase();
    const password  = String(body.password  ?? '');

    if (!firstName || !lastName || !username || !email || !password) {
      return fail(400, 'VALIDATION_ERROR', 'firstName, lastName, username, email and password are required');
    }

    // Le formulaire envoie individual/organization ; KSM n'accepte que PROSPECT/BUSINESS.
    const accountType = body.accountType === 'organization' ? 'BUSINESS' : 'PROSPECT';
    const orgCode = String(body.orgCode ?? '').trim();

    // Step 1 — discover sign-up context
    let discovery: authApi.DiscoverSignUpContextsResponse | null = null;
    if (accountType === 'BUSINESS') {
      if (!orgCode) {
        return fail(400, 'ORG_CODE_REQUIRED', "Le code de l'organisation est requis.");
      }
      try {
        discovery = await authApi.discoverSignUpContexts(orgCode);
      } catch (err) {
        logger.warn({ err, orgCode }, 'Failed to discover custom sign-up context');
      }

      if (!discovery || !discovery.contexts || !discovery.contexts.length) {
        return fail(404, 'ORG_NOT_FOUND', "L'organisation n'existe pas dans KSM. Inscription en tant que particulier requise.");
      }
    } else {
      discovery = await authApi.discoverSignUpContexts('YOWNEWS');
      if (!discovery || !discovery.contexts || !discovery.contexts.length) {
        return fail(404, 'ORG_NOT_FOUND', 'YowNews organisation not found. Contact support.');
      }
    }

    const ctx = discovery.contexts[0];

    if (accountType === 'BUSINESS') {
      // Pour les organisations, on valide les identifiants KSM du représentant
      let userDiscovery;
      try {
        userDiscovery = await authApi.discoverContexts(email, password);
      } catch (err) {
        return fail(401, 'INVALID_CREDENTIALS', 'Adresse email ou mot de passe KSM incorrect.');
      }

      if (!userDiscovery || !userDiscovery.contexts || !userDiscovery.contexts.length) {
        return fail(401, 'INVALID_CREDENTIALS', 'Adresse email ou mot de passe KSM incorrect.');
      }

      // Trouver le contexte KSM correspondant à l'organisation cible
      const targetCtx = userDiscovery.contexts.find((c) =>
        c.organizations.some((o) => o.organizationCode === orgCode)
      );

      if (!targetCtx) {
        return fail(403, 'NOT_ASSOCIATED', "Vous n'avez pas accès à cette organisation.");
      }

      const matchedOrg = targetCtx.organizations.find((o) => o.organizationCode === orgCode);
      const orgId = matchedOrg?.organizationId;

      // Se connecter pour vérifier si c'est bien le propriétaire (owner)
      let contextual;
      try {
        contextual = await authApi.selectContext(userDiscovery.selectionToken, targetCtx.contextId, orgId);
      } catch (err) {
        return fail(400, 'CONTEXT_SELECT_FAILED', 'Erreur lors de la sélection du contexte KSM.');
      }

      const authorities = contextual.session.authorities ?? [];
      const isOwner = authorities.includes('tenant:admin') || authorities.includes('ROLE_GENERAL_ADMIN') || authorities.includes('GENERAL_ADMIN');

      if (!isOwner) {
        return fail(403, 'NOT_OWNER', "Seul le propriétaire de l'organisation est autorisé à l'inscrire.");
      }

      // Attribution du rôle lecteur sur la plateforme (best-effort)
      await provisionReaderRoles(contextual.session.id, email);

      const session = buildSessionFromSignUp(contextual.session, ctx.tenantId);
      if (orgId) {
        session.workspace = {
          tenantId: contextual.selectedTenantId,
          organizationId: orgId,
          organizationCode: orgCode,
          organizationName: matchedOrg ? (matchedOrg.displayName ?? matchedOrg.shortName) : undefined,
        };
      }
      await writeSession(session);

      return ok(
        {
          user: session.user,
          workspace: session.workspace,
          accountMode: 'organization' as const,
        },
        { status: 201 },
      );
    } else {
      // Particulier — comportement classique de création de compte
      const registered = await authApi.signUp({
        signUpSelectionToken: discovery.selectionToken,
        contextId: ctx.contextId,
        firstName,
        lastName,
        username,
        email,
        password,
        phoneNumber:  body.phoneNumber,
        accountType,
        businessType: body.businessType,
      });

      // Rattache le compte à l'organisation YowNews (best-effort, ne bloque jamais
      // l'inscription — cf. plan "particuliers → org YowNews").
      await attachToYowNewsOrganization({ email, firstName, lastName, phoneNumber: body.phoneNumber });

      // Mode strict KSM : un compte LOCAL avec email non vérifié ne reçoit aucune
      // session à l'inscription. Rien à provisionner/écrire tant que l'email n'est
      // pas confirmé (cf. /auth/verify-email).
      if (authApi.isEmailVerificationRequired(registered)) {
        return ok(
          {
            emailVerificationRequired: true as const,
            email: registered.email,
            accountMode: 'individual' as const,
          },
          { status: 201 },
        );
      }

      await provisionReaderRoles(registered.id, email);

      const session =
        (await reloginSession(email, password)) ?? buildSessionFromSignUp(registered, ctx.tenantId);
      await writeSession(session);

      return ok(
        {
          user: session.user,
          workspace: session.workspace,
          accountMode: 'individual' as const,
        },
        { status: 201 },
      );
    }
  });
}

/**
 * Rattache un particulier fraîchement inscrit à l'organisation YowNews (EmployeeMembership
 * côté KSM), pour que ses logins suivants la résolvent parmi ses contextes. Fail-open :
 * une erreur (y compris "déjà membre") est loguée mais ne fait jamais échouer l'inscription.
 */
async function attachToYowNewsOrganization(input: {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}): Promise<void> {
  try {
    const [adminSession, organizationId] = await Promise.all([
      getAdminSession(),
      resolvePlatformOrganizationId(),
    ]);
    if (!adminSession || !organizationId) return;
    await inviteEmployee(adminSession, organizationId, {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      jobTitle: 'Lecteur',
      employmentType: 'READER',
    });
  } catch (cause) {
    logger.warn({ cause, email: input.email }, 'auth.sign_up.organization_membership_failed');
  }
}

/** Re-login l'utilisateur pour obtenir des authorities à jour ; null si le re-login échoue. */
async function reloginSession(email: string, password: string): Promise<AppSession | null> {
  try {
    const discovery = await authApi.discoverContexts(email, password);
    const ctx = discovery.contexts[0];
    if (!ctx) return null;
    const orgId = ctx.organizations[0]?.organizationId ?? undefined;
    const contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    const s = contextual.session;
    return {
      sid: crypto.randomUUID(),
      accessToken: s.accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + s.expiresInSeconds,
      forcePasswordChange: s.forcePasswordChange,
      user: {
        id: s.id,
        tenantId: contextual.selectedTenantId,
        email: s.email,
        firstName: s.firstName ?? undefined,
        lastName: s.lastName ?? undefined,
        roles: s.authorities,
        permissions: s.authorities,
      },
      workspace: {
        tenantId: contextual.selectedTenantId,
        ...(contextual.selectedOrganizationId
          ? { organizationId: contextual.selectedOrganizationId }
          : {}),
      },
    };
  } catch (cause) {
    logger.error({ cause }, 'auth.sign_up.relogin_failed');
    return null;
  }
}

function buildSessionFromSignUp(
  s: authApi.KsmLoginSession,
  tenantId: string,
): AppSession {
  return {
    sid: crypto.randomUUID(),
    accessToken: s.accessToken,
    expiresAt: Math.floor(Date.now() / 1000) + s.expiresInSeconds,
    forcePasswordChange: s.forcePasswordChange,
    user: {
      id: s.id,
      tenantId: s.tenantId ?? tenantId,
      email: s.email,
      firstName: s.firstName ?? undefined,
      lastName: s.lastName ?? undefined,
      roles: s.authorities,
      permissions: s.authorities,
    },
    workspace: {
      tenantId: s.tenantId ?? tenantId,
    },
  };
}
