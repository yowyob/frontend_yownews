import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail, ok } from '@/server/api-response';
import * as authApi from '@/server/ksm/modules/auth';
import { provisionReaderRoles, provisionOwnerRole } from '@/server/ksm/admin-session';
import { writeSession } from '@/server/session';
import { logger } from '@/server/logger';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { serverEnv } from '@/env';

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
      discovery = await authApi.discoverSignUpContexts(serverEnv.KSM_PLATFORM_ORG_CODE);
      if (!discovery || !discovery.contexts || !discovery.contexts.length) {
        return fail(404, 'ORG_NOT_FOUND', 'Yowyob Education organisation not found. Contact support.');
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

      // Pré-check best-effort : /api/auth/identify est cross-tenant (KSM ne filtre pas par
      // tenant sur cet endpoint), donc un accountExists:true peut correspondre à un compte
      // dans un tout autre tenant que Yowyob Education — indicatif seulement, jamais garanti à 100 %.
      // Un échec de ce check ne doit jamais bloquer l'inscription.
      try {
        const identify = await authApi.identifyAccount(email);
        if (identify.accountExists) {
          return fail(
            409,
            'ACCOUNT_MAY_EXIST',
            'Un compte existe peut-être déjà avec cet email. Essayez de vous connecter, ou contactez le support si vous pensez qu\'il s\'agit d\'une erreur.',
          );
        }
      } catch (err) {
        logger.warn({ err, email }, 'auth.sign_up.identify_check_failed');
      }

      let registered: authApi.SignUpResult;
      try {
        registered = await authApi.signUp({
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
      } catch (err) {
        // Dégradation propre : KSM peut renvoyer un 500 non explicite pour un cas non géré
        // (ex. un Actor existe déjà pour cet email sans compte associé — connu, non corrigé
        // ici par contrainte de périmètre, cf. ADMIN_EDITOR_CONTEXT.md §18.3). Le pré-check
        // ci-dessus n'a rien détecté : on masque le message technique brut par un message
        // générique exploitable, plutôt que de le laisser remonter tel quel.
        if (err instanceof HttpError && err.status >= 500) {
          logger.error({ err, email }, 'auth.sign_up.failed_unhandled');
          return fail(
            500,
            'SIGN_UP_FAILED',
            "Impossible de finaliser l'inscription. Si vous pensez avoir déjà un compte, essayez de vous connecter ; sinon contactez le support.",
          );
        }
        throw err;
      }

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
      // Cas rare (pas de vérification email requise) : ici le userId est déjà connu,
      // donc l'attribution OWNER peut se faire directement (cf. cas courant dans
      // /api/auth/email-verification/confirm, qui couvre le flux normal).
      await provisionOwnerRole(registered.id);

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
