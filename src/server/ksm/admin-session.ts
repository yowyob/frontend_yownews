import 'server-only';
import { serverEnv } from '@/env';
import { logger } from '@/server/logger';
import type { AppSession } from '@/lib/types/auth';
import { HttpError } from '@/lib/types/api';
import { getMockSession } from '@/server/mock-session';
import * as authApi from '@/server/ksm/modules/auth';
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
  ROLE_CODE_NEWSLETTER_EDITOR,
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
 * Assigne les rôles Lecteur par défaut d'un nouveau compte Yowyob Education : education + newsletter.
 * Un lecteur doit pouvoir consulter/s'abonner aux catégories newsletter dès l'inscription — cf.
 * bug où EDUCATION_READER_PERMISSIONS seul ne porte aucune permission newsletter:*.
 * Best-effort par rôle : l'échec d'un rôle n'empêche pas l'assignation de l'autre.
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

  const [educationRoleId, newsletterRoleId] = await Promise.all([
    getReaderRoleId(adminSession),
    getNewsletterReaderRoleId(adminSession),
  ]);

  if (educationRoleId) {
    try {
      await assignRole(adminSession, targetUserId, educationRoleId);
    } catch (cause) {
      logger.error({ cause, userId: targetUserId }, 'ksm.admin_session.education_reader_role_assignment_failed');
    }
  }
  if (newsletterRoleId) {
    try {
      await assignRole(adminSession, targetUserId, newsletterRoleId);
    } catch (cause) {
      logger.error({ cause, userId: targetUserId }, 'ksm.admin_session.newsletter_reader_role_assignment_failed');
    }
  }
}

/**
 * Promeut un compte Lecteur en Rédacteur : révoque les rôles Lecteur (education + newsletter)
 * s'ils sont présents, assigne les rôles Éditeur (education + newsletter) s'ils manquent.
 * Idempotent — safe à rappeler plusieurs fois. `session` = la session de l'admin appelant
 * (déjà vérifiée `isPlatformAdmin` par la route), pas la session service.
 */
export async function promoteToEditorRoles(session: AppSession, userId: string): Promise<void> {
  const roles = await listRoles(session);
  const educationEditorRoleId = roles.find((r) => r.code === ROLE_CODE_EDITOR)?.id;
  const newsletterEditorRoleId = roles.find((r) => r.code === ROLE_CODE_NEWSLETTER_EDITOR)?.id;
  if (!educationEditorRoleId || !newsletterEditorRoleId) {
    logger.error(
      { educationEditorRoleId, newsletterEditorRoleId },
      'ksm.admin_session.editor_role_not_found',
    );
    throw new Error('Rôle Éditeur (education ou newsletter) introuvable.');
  }

  const users = await listTenantUsers(session);
  const target = users.find((u) => u.userId === userId);

  if (target) {
    const readerAssignments = target.roles.filter(
      (r) => r.code === ROLE_CODE_READER || r.code === ROLE_CODE_NEWSLETTER_READER,
    );
    for (const r of readerAssignments) {
      await revokeRole(session, userId, r.assignmentId);
    }
    const alreadyEducationEditor = target.roles.some((r) => r.code === ROLE_CODE_EDITOR);
    if (!alreadyEducationEditor) await assignRole(session, userId, educationEditorRoleId);
    const alreadyNewsletterEditor = target.roles.some((r) => r.code === ROLE_CODE_NEWSLETTER_EDITOR);
    if (!alreadyNewsletterEditor) await assignRole(session, userId, newsletterEditorRoleId);
  } else {
    await assignRole(session, userId, educationEditorRoleId);
    await assignRole(session, userId, newsletterEditorRoleId);
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
