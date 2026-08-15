import 'server-only';
import { serverEnv } from '@/env';
import { logger } from '@/server/logger';
import type { AppSession } from '@/lib/types/auth';
import { HttpError } from '@/lib/types/api';
import { getMockSession } from '@/server/mock-session';
import * as authApi from '@/server/ksm/modules/auth';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import {
  listRoles,
  listTenantUsers,
  assignRole,
  revokeRole,
  provisionDefaultRoles,
  findRoleIdByCode,
  ROLE_CODE_READER,
  ROLE_CODE_NEWSLETTER_READER,
  ROLE_CODE_EDITOR,
  OWNER_ROLE_CODES,
  ROLE_CODE_OWNER,
} from '@/server/ksm/modules/administration';

// Session admin Yowyob Education obtenue côté serveur et réutilisée pour les opérations privilégiées
// (poser le rôle Lecteur aux nouveaux inscrits). L'admin a déjà administration:assignments:write.
// Mise en cache en mémoire (pattern de platform-org.ts) ; re-login peu avant expiration.

let cachedSession: AppSession | null = null;
let cachedReaderRoleId: string | null = null;
let cachedNewsletterReaderRoleId: string | null = null;
let cachedOwnerRoleId: string | null = null;

// marge de sécurité avant l'expiration du token (secondes)
const REFRESH_MARGIN_SECONDS = 60;

function buildAdminSession(contextual: authApi.ContextualLoginResponse): AppSession {
  const s = contextual.session;
  return {
    sid: 'admin-service',
    accessToken: s.accessToken,
    expiresAt: Math.floor(Date.now() / 1000) + s.expiresInSeconds,
    user: {
      id: s.id,
      tenantId: contextual.selectedTenantId,
      email: s.email,
      username: s.username,
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
}

/**
 * Invalide le cache de la session admin — à appeler quand un appel KSM utilisant cette session
 * échoue en 401 malgré une expiration non atteinte (ex. redémarrage KSM avec
 * IWM_JWT_AUTO_GENERATE_KEY_PAIR=true : la paire de clés de signature change, tous les tokens émis
 * avant le redémarrage deviennent invalides bien qu'ils ne soient pas "expirés" du point de vue du
 * cache, purement temporel). Le prochain `getAdminSession()` refait un login frais.
 */
export function invalidateAdminSession(): void {
  cachedSession = null;
}

/**
 * Exécute `fn` avec la session admin ; si l'appel échoue avec 401 (token en cache invalidé côté
 * KSM — ex. redémarrage avec régénération de la paire de clés JWT en local), invalide le cache et
 * retente une fois avec un login frais. Même pattern que `checkOrgSubscription`
 * (`org-activation.ts`), factorisé ici pour les autres appelants best-effort (résolution de
 * nom/photo d'auteur, etc.). Renvoie `null` si aucune session admin n'est disponible (non
 * configurée) ou si le retry échoue aussi.
 */
export async function withAdminSession<T>(fn: (admin: AppSession) => Promise<T>): Promise<T | null> {
  const admin = await getAdminSession();
  if (!admin) return null;
  try {
    return await fn(admin);
  } catch (cause) {
    if (cause instanceof HttpError && cause.status === 401) {
      logger.warn({}, 'ksm.admin_session.retry_after_401');
      invalidateAdminSession();
      const fresh = await getAdminSession();
      if (!fresh) return null;
      return await fn(fresh);
    }
    throw cause;
  }
}

/**
 * Login admin (creds en env) et renvoie une AppSession utilisable par les modules KSM.
 * Renvoie null si non configuré ou si le login échoue (l'appelant doit dégrader proprement).
 */
export async function getAdminSession(): Promise<AppSession | null> {
  if (serverEnv.MOCK_MODE) return getMockSession('admin');

  const now = Math.floor(Date.now() / 1000);
  if (cachedSession && cachedSession.expiresAt - REFRESH_MARGIN_SECONDS > now) {
    return cachedSession;
  }

  const password = serverEnv.KSM_PLATFORM_ADMIN_PASSWORD;
  
  const emailEnv = serverEnv.KSM_PLATFORM_ADMIN_EMAIL;
  const emailUsableAsIdentifier = !!emailEnv && !emailEnv.toLowerCase().endsWith('@example.com');
  const principal = serverEnv.KSM_PLATFORM_ADMIN_USERNAME || (emailUsableAsIdentifier ? emailEnv : '');
  if (!principal || !password) {
    logger.warn(
      {
        hasUsername: !!serverEnv.KSM_PLATFORM_ADMIN_USERNAME,
        hasEmailFallback: emailUsableAsIdentifier,
        hasPassword: !!password,
      },
      'ksm.admin_session.not_configured — définir KSM_PLATFORM_ADMIN_USERNAME (+ _PASSWORD) ; ' +
        "l'email @example.com n'est plus un identifiant de connexion KSM.",
    );
    return null;
  }

  try {
    const discovery = await authApi.discoverContexts(principal, password);
    if (!discovery.contexts.length) {
      logger.warn({}, 'ksm.admin_session.no_context');
      return null;
    }
    // Le compte de service admin peut lui aussi avoir plusieurs contexts (modèle "1 personne = 1
    // compte", cf. auth/login/route.ts). Prendre contexts[0] à l'aveugle peut sélectionner un tenant
    // où l'admin n'a pas l'org plateforme, alors que resolvePlatformOrganizationId() (lookup par code,
    // indépendant de cette session) renvoie bien l'id de l'org plateforme sous SON tenant à elle —
    // combiner les deux produit un tenantId/organizationId incohérents que KSM rejette (401 brut).
    // On sélectionne donc explicitement le context dont l'org correspond au code plateforme.
    const candidates = discovery.contexts.flatMap((c) => (c.organizations ?? []).map((org) => ({ ctx: c, org })));
    const platformCandidate = candidates.find(({ org }) => org.organizationCode === serverEnv.KSM_PLATFORM_ORG_CODE);
    const chosen = platformCandidate ?? candidates[0];
    const ctx = chosen?.ctx ?? discovery.contexts[0]!;
    const orgId = chosen?.org?.organizationId ?? ctx.organizations[0]?.organizationId ?? undefined;
    const contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    cachedSession = buildAdminSession(contextual);
    return cachedSession;
  } catch (cause) {
    if (cause instanceof HttpError && cause.errorCode === 'MFA_REQUIRED_FOR_ADMIN') {
  
      logger.error(
        { cause },
        'ksm.admin_session.mfa_required — le compte de service porte un rôle admin privilégié ' +
          '(ROLE_TENANT_ADMIN/SYSTEM_ADMIN/GENERAL_ADMIN/IAM_ADMIN) au lieu de OWNER seul ; ' +
          'retirer ce rôle ou provisionner un compte OWNER dédié sans rôle *_ADMIN.',
      );
      cachedSession = null;
      return null;
    }
    logger.error({ cause }, 'ksm.admin_session.login_failed');
    cachedSession = null;
    return null;
  }
}

/** Id du rôle Lecteur (EDUCATION_READER_PERMISSIONS) ; mis en cache (stable). */
export async function getReaderRoleId(adminSession: AppSession): Promise<string | null> {
  if (cachedReaderRoleId) return cachedReaderRoleId;
  try {
    const roles = await listRoles(adminSession);
    cachedReaderRoleId = roles.find((r) => r.code === ROLE_CODE_READER)?.id ?? null;
    if (!cachedReaderRoleId) {
      logger.warn({ code: ROLE_CODE_READER }, 'ksm.admin_session.reader_role_not_found');
    }
    return cachedReaderRoleId;
  } catch (cause) {
    logger.error({ cause }, 'ksm.admin_session.list_roles_failed');
    return null;
  }
}

/** Id du rôle Lecteur newsletter (NEWSLETTER_READER) ; mis en cache (stable). */
export async function getNewsletterReaderRoleId(adminSession: AppSession): Promise<string | null> {
  if (cachedNewsletterReaderRoleId) return cachedNewsletterReaderRoleId;
  try {
    const roles = await listRoles(adminSession);
    cachedNewsletterReaderRoleId = roles.find((r) => r.code === ROLE_CODE_NEWSLETTER_READER)?.id ?? null;
    if (!cachedNewsletterReaderRoleId) {
      logger.warn({ code: ROLE_CODE_NEWSLETTER_READER }, 'ksm.admin_session.newsletter_reader_role_not_found');
    }
    return cachedNewsletterReaderRoleId;
  } catch (cause) {
    logger.error({ cause }, 'ksm.admin_session.list_roles_failed');
    return null;
  }
}

/**
 * Attribue uniquement le rôle Lecteur newsletter après une invitation. L'API d'invitation
 * renvoie une adhésion, mais son `userId` ne doit pas être réutilisé comme identifiant du
 * compte dans l'API d'administration : on résout donc explicitement le compte du tenant.
 */
export async function provisionNewsletterReaderRole(email: string): Promise<void> {
  const adminSession = await getAdminSession();
  if (!adminSession) return;

  try {
    const users = await listTenantUsers(adminSession);
    const userId = users.find((user) => user.email.toLowerCase() === email.toLowerCase())?.userId;
    if (!userId) {
      logger.warn({ email }, 'ksm.admin_session.newsletter_reader_user_not_found');
      return;
    }

    const [newsletterRoleId, platformOrgId] = await Promise.all([
      getNewsletterReaderRoleId(adminSession),
      resolvePlatformOrganizationId(),
    ]);
    if (!newsletterRoleId || !platformOrgId) return;
    await assignRole(adminSession, userId, newsletterRoleId, platformOrgId);
  } catch (cause) {
    logger.error({ cause, email }, 'ksm.admin_session.newsletter_reader_role_assignment_failed');
  }
}

/**
 * Assigne les rôles Lecteur par défaut d'un compte Yowyob Education : education + newsletter,
 * scopés sur l'org **plateforme**, via l'identité admin. Utilisé au sign-up (le lecteur n'a pas
 * encore d'org freelance et lit alors dans le contexte plateforme). L'admin étant membre de l'org
 * plateforme, l'attribution org-scopée y est acceptée. Best-effort par rôle.
 * NB : pour un lecteur freelance déjà connecté dans SA propre org, c'est `provisionReaderRolesSelf`
 * qu'il faut (l'admin n'est pas membre de l'org freelance → 401).
 */
export async function provisionReaderRoles(userId: string | undefined, email?: string): Promise<void> {
  const adminSession = await getAdminSession();
  if (!adminSession) return;

  let targetUserId = userId;
  if (!targetUserId && email) {
    try {
      const users = await listTenantUsers(adminSession);
      targetUserId = users.find((u) => u.email.toLowerCase() === email.toLowerCase())?.userId;
    } catch (cause) {
      logger.error({ cause, email }, 'ksm.admin_session.resolve_user_id_failed');
    }
  }

  if (!targetUserId) {
    logger.warn({ email }, 'ksm.admin_session.no_user_id_to_provision');
    return;
  }

  const [educationRoleId, newsletterRoleId, platformOrgId] = await Promise.all([
    getReaderRoleId(adminSession),
    getNewsletterReaderRoleId(adminSession),
    resolvePlatformOrganizationId(),
  ]);

  if (educationRoleId) {
    try {
      await assignRole(adminSession, targetUserId, educationRoleId, platformOrgId);
    } catch (cause) {
      logger.error({ cause, userId: targetUserId }, 'ksm.admin_session.education_reader_role_assignment_failed');
    }
  }
  if (newsletterRoleId) {
    try {
      await assignRole(adminSession, targetUserId, newsletterRoleId, platformOrgId);
    } catch (cause) {
      logger.error({ cause, userId: targetUserId }, 'ksm.admin_session.newsletter_reader_role_assignment_failed');
    }
  }
}

// ── Bascule Lecteur→Rédacteur (brique unique) ─────────────────────────────────────────────────
//
// Modèle courant : chaque compte est un "employé" invité dans l'org Yowyob Education. Le contrôle
// d'accès reste centralisé : l'admin (owner de l'org) APPROUVE la candidature rédacteur, puis
// c'est lui qui attribue le rôle — jamais l'utilisateur lui-même. Peu importe qu'un compte
// possède par ailleurs une autre organisation ou non, seule son appartenance "employé" à Yowyob
// Education compte ici. (L'ancien modèle — un compte auto-attribuant son rôle sur SA PROPRE org,
// en tant qu'OWNER de celle-ci — est abandonné.)

/**
 * Promeut un employé de l'org Yowyob Education de Lecteur à Rédacteur : révoque le rôle Lecteur
 * puis assigne le rôle Rédacteur, via l'identité admin (owner de l'org, habilité à y gérer les
 * rôles) — même mécanisme que la bascule manuelle de l'écran admin « Utilisateurs »
 * (`/api/admin/users/{id}/roles`). Idempotent (renvoie `false` sans rien faire si déjà promu).
 * Best-effort par étape : une révocation en échec n'empêche pas l'attribution du nouveau rôle
 * (KSM tolère la coexistence temporaire des deux).
 */
export async function promoteToEditorOnPlatformOrg(adminSession: AppSession, userId: string): Promise<boolean> {
  const [users, roles] = await Promise.all([listTenantUsers(adminSession), listRoles(adminSession)]);
  const user = users.find((u) => u.userId === userId);
  const editorRole = roles.find((r) => r.code === ROLE_CODE_EDITOR);
  if (!user || !editorRole) return false;
  if (user.roles.some((r) => r.code === ROLE_CODE_EDITOR)) return false; // déjà promu

  for (const r of user.roles.filter((r) => r.code === ROLE_CODE_READER)) {
    try {
      await revokeRole(adminSession, userId, r.assignmentId);
    } catch (cause) {
      logger.error({ cause, userId }, 'ksm.editor_promotion.revoke_reader_failed');
    }
  }
  try {
    await assignRole(adminSession, userId, editorRole.id);
    return true;
  } catch (cause) {
    logger.error({ cause, userId }, 'ksm.editor_promotion.assign_editor_failed');
    return false;
  }
}

/**
 * Identité à utiliser pour les opérations d'administration d'une ORGANISATION (employés, rôles).
 *
 * En mode organisation, l'org vit dans un tenant DÉDIÉ : l'admin plateforme (autre tenant) ne la voit
 * même pas (`404 ORGANIZATION_NOT_FOUND`). C'est donc le compte de l'utilisateur — owner, qui détient
 * `ROLE_OWNER#TENANT` (tenant:admin) sur SON tenant — qui doit agir. Hors mode organisation, on garde
 * l'identité admin partagée (comportement freelance/plateforme inchangé).
 */
export async function orgOperationSession(session: AppSession): Promise<AppSession | null> {
  if (session.workspace?.orgMode === true) return session;
  return getAdminSession();
}

/**
 * Attribue à un utilisateur, org-scopés et best-effort, une liste de rôles secondaires (par code) —
 * utilisé pour compléter le rôle principal d'un employé (ex. ajouter FORUM_EDITOR à un rédacteur
 * éducation, KSM ne portant qu'un roleId par appartenance). L'échec d'un code n'interrompt pas les
 * autres. `adminSession` sert d'identité privilégiée pour résoudre et attribuer.
 */
export async function assignExtraRoles(
  adminSession: AppSession,
  organizationId: string,
  userId: string,
  codes: readonly string[],
): Promise<void> {
  for (const code of codes) {
    try {
      const roleId = await findRoleIdByCode(adminSession, organizationId, code);
      if (!roleId) {
        logger.warn({ code, organizationId }, 'ksm.org_role.extra_role_not_found');
        continue;
      }
      await assignRole(adminSession, userId, roleId, organizationId);
    } catch (cause) {
      logger.error({ cause, code, organizationId, userId }, 'ksm.org_role.extra_role_assign_failed');
    }
  }
}

/**
 * Attribue à un owner d'organisation le rôle le plus élevé de chaque module
 * (EDUCATION_MANAGER, NEWSLETTER_MANAGER, FORUM_MANAGER — jamais
 * SUPER_EDUCATION_SERVICES_MANAGER, réservé au staff plateforme), en utilisant
 * l'identité admin partagée (pas le token de l'owner) — évite la contrainte de
 * reconnexion après attribution de rôle. Best-effort par rôle : l'échec d'un rôle
 * n'empêche pas l'attribution des autres. Ne fait rien si l'admin-session n'est pas
 * configurée (dégradation silencieuse, ne bloque jamais la création d'organisation).
 */
export async function provisionOwnerRoles(organizationId: string, userId: string): Promise<void> {
  const adminSession = await getAdminSession();
  if (!adminSession) return;

  try {
    await provisionDefaultRoles(adminSession, organizationId);
  } catch (cause) {
    logger.error({ cause, organizationId }, 'ksm.admin_session.provision_default_roles_failed');
  }

  for (const code of OWNER_ROLE_CODES) {
    try {
      const roleId = await findRoleIdByCode(adminSession, organizationId, code);
      if (!roleId) {
        logger.warn({ code, organizationId }, 'ksm.admin_session.owner_role_not_found');
        continue;
      }
      await assignRole(adminSession, userId, roleId, organizationId);
    } catch (cause) {
      logger.error({ cause, code, organizationId, userId }, 'ksm.admin_session.owner_role_assignment_failed');
    }
  }
}

/**
 * Attribue le rôle tenant-scope `OWNER` à un utilisateur — préalable indispensable
 * (`organizations:write`) avant qu'il puisse créer une organisation (cf. guide KSM
 * "Créer et gérer une organisation via les endpoints kernel-core", étape 3). À appeler
 * à l'inscription (pas au login) : le token utilisé plus tard pour créer l'organisation
 * doit déjà porter cette autorité — KSM ne reflète un nouveau rôle qu'après un nouveau
 * login, et sign-up/1ᵉʳ login sont deux requêtes distinctes (vérification email entre
 * les deux), donc la contrainte est respectée naturellement. Best-effort/silencieux.
 */
export async function provisionOwnerRole(userId: string): Promise<void> {
  const adminSession = await getAdminSession();
  if (!adminSession) return;

  try {
    if (!cachedOwnerRoleId) {
      cachedOwnerRoleId = await findRoleIdByCode(adminSession, null, ROLE_CODE_OWNER);
    }
    if (!cachedOwnerRoleId) {
      logger.warn({}, 'ksm.admin_session.owner_role_not_found');
      return;
    }
    await assignRole(adminSession, userId, cachedOwnerRoleId, null, 'TENANT');
  } catch (cause) {
    logger.error({ cause, userId }, 'ksm.admin_session.owner_role_assignment_failed');
  }
}
