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
  provisionDefaultRoles,
  findRoleIdByCode,
  ROLE_CODE_READER,
  ROLE_CODE_NEWSLETTER_READER,
  ROLE_CODE_EDITOR,
  ROLE_CODE_NEWSLETTER_EDITOR,
  ROLE_CODE_FORUM_USER,
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
 * Login admin (creds en env) et renvoie une AppSession utilisable par les modules KSM.
 * Renvoie null si non configuré ou si le login échoue (l'appelant doit dégrader proprement).
 */
export async function getAdminSession(): Promise<AppSession | null> {
  if (serverEnv.MOCK_MODE) return getMockSession('admin');

  const now = Math.floor(Date.now() / 1000);
  if (cachedSession && cachedSession.expiresAt - REFRESH_MARGIN_SECONDS > now) {
    return cachedSession;
  }

  const email = serverEnv.KSM_PLATFORM_ADMIN_EMAIL;
  const password = serverEnv.KSM_PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) {
    logger.warn({}, 'ksm.admin_session.not_configured');
    return null;
  }

  try {
    const discovery = await authApi.discoverContexts(email, password);
    const ctx = discovery.contexts[0];
    if (!ctx) {
      logger.warn({}, 'ksm.admin_session.no_context');
      return null;
    }
    const orgId = ctx.organizations[0]?.organizationId ?? undefined;
    const contextual = await authApi.selectContext(discovery.selectionToken, ctx.contextId, orgId);
    cachedSession = buildAdminSession(contextual);
    return cachedSession;
  } catch (cause) {
    if (cause instanceof HttpError && cause.errorCode === 'MFA_REQUIRED_FOR_ADMIN') {
      // Le compte de service (KSM_PLATFORM_ADMIN_*) doit rester un OWNER simple (autorité
      // ROLE_OWNER) : KSM n'exige la MFA que pour les rôles ROLE_{TENANT,SYSTEM,GENERAL,IAM}_ADMIN
      // (cf. AuthController.isPrivilegedAdminAuthority côté KSM). Si ce signal apparaît, le compte a
      // été mal reconfiguré (rôle admin ajouté par erreur) — échec explicite plutôt que silencieux.
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

// ── Auto-provisionnement des rôles de service (brique unique) ────────────────────────────────
//
// Contrainte KSM (vérifiée) : pour attribuer un rôle scopé ORGANIZATION sur une org X, l'identité
// qui agit doit être MEMBRE de X (sinon 401 "organization not accessible") + porter tenant:admin.
// L'admin plateforme n'est membre que de l'org plateforme → il ne peut PAS attribuer un rôle sur
// l'org freelance d'un utilisateur. Le scope TENANT est refusé (400, ces rôles sont de type
// ORGANIZATION). SEULE voie possible : l'utilisateur — OWNER de sa propre org, donc membre +
// tenant:admin — s'auto-attribue le rôle scopé sur son org, via SON token (vérifié : 201).
//
// Ci-dessous, une brique data-driven qui matérialise, sur l'org de l'utilisateur, les rôles
// correspondant à son niveau d'habilitation. L'admin garde le contrôle d'accès (il APPROUVE la
// candidature rédacteur) ; ici on ne fait que matérialiser au login le niveau déjà autorisé.

export type EntitlementLevel = 'reader' | 'editor';

// Source unique de la matrice niveau → rôles. FORUM_USER est un rôle de base (tout utilisateur peut
// créer un forum public, ensuite approuvé par l'admin). EDUCATION_EDITOR inclut déjà les perms read,
// donc supersède le rôle lecteur education au niveau editor.
const SERVICE_ROLES_BY_LEVEL: Record<EntitlementLevel, readonly string[]> = {
  reader: [ROLE_CODE_READER, ROLE_CODE_NEWSLETTER_READER, ROLE_CODE_FORUM_USER],
  editor: [ROLE_CODE_EDITOR, ROLE_CODE_NEWSLETTER_EDITOR, ROLE_CODE_FORUM_USER],
};

// Permission "marqueur" par code de rôle : si elle est déjà dans le token, le rôle est inutile à
// réassigner (idempotence bon marché, sans lecture des assignations).
const ROLE_MARKER_PERMISSION: Record<string, string> = {
  [ROLE_CODE_READER]: 'education:content:read',
  [ROLE_CODE_EDITOR]: 'education:content:create',
  [ROLE_CODE_NEWSLETTER_READER]: 'newsletter:newsletter:read',
  [ROLE_CODE_NEWSLETTER_EDITOR]: 'newsletter:newsletter:create',
  [ROLE_CODE_FORUM_USER]: 'forum:create',
};

function tokenHasPermission(session: AppSession, perm: string): boolean {
  return (session.user.permissions ?? session.user.roles ?? []).some(
    (p) => p === perm || p.startsWith(perm + '#'),
  );
}

/**
 * Matérialise, **via le token de l'utilisateur** (`session`, OWNER de son org), les rôles de service
 * du niveau `level`, scopés sur `organizationId` (son org). Idempotent : ne (ré)assigne un rôle que
 * si sa permission marqueur est absente du token courant. Best-effort par rôle (un 409 "déjà assigné"
 * est loggé sans bloquer les autres). Les IDs de rôle sont résolus via l'identité admin (lecture
 * seule ; repli sur `session`).
 */
export async function ensureServiceRolesSelf(
  session: AppSession,
  organizationId: string,
  level: EntitlementLevel,
): Promise<boolean> {
  // Rôles du niveau dont la permission marqueur n'est PAS déjà dans le token (à (ré)attribuer).
  const missing = SERVICE_ROLES_BY_LEVEL[level].filter((code) => {
    const marker = ROLE_MARKER_PERMISSION[code];
    return !(marker && tokenHasPermission(session, marker));
  });
  if (missing.length === 0) return false; // déjà tout provisionné → aucun appel KSM

  const roleSource = (await getAdminSession()) ?? session;
  const roles = await listRoles(roleSource);
  const roleIdByCode = new Map(roles.map((r) => [r.code, r.id]));

  let changed = false;
  for (const code of missing) {
    const roleId = roleIdByCode.get(code);
    if (!roleId) {
      logger.warn({ code, organizationId }, 'ksm.service_role.role_not_found');
      continue;
    }
    try {
      await assignRole(session, session.user.id, roleId, organizationId);
      changed = true;
    } catch (cause) {
      logger.error({ cause, code, organizationId }, 'ksm.service_role.self_assign_failed');
    }
  }
  return changed;
}

// NB : la promotion Lecteur→Rédacteur ne matérialise PLUS les rôles ici. L'ancien
// `promoteToEditorRoles` attribuait via l'admin un rôle scopé sur l'org PLATEFORME, invisible dans
// le token freelance du rédacteur (il restait bloqué en "reader", ne pouvait pas créer). Désormais
// l'approbation ne fait qu'enregistrer le statut APPROVED ; le rédacteur matérialise lui-même son
// rôle éditeur (scopé sur SON org) à sa connexion suivante, via `ensureServiceRolesSelf(level='editor')`
// appelé depuis la route de login. Cf. docs/service-role-provisioning.md.

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
