import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { HttpError } from '@/lib/types/api';
import { writeSession } from '@/server/session';
import { getOrganizationServices } from '@/server/ksm/modules/organizations';
import { getAdminSession, invalidateAdminSession } from '@/server/ksm/admin-session';
import { logger } from '@/server/logger';
import type { OrgLoginOrganization } from '@/server/org-login-pending';

/** Au moins un de ces services doit être souscrit par l'organisation pour qu'elle soit
 *  utilisable en mode organisation (cf. registre kernel.platform_external_service). Education et
 *  Forum restent bien des services gatés par abonnement au même titre que Newsletter/HRM (cf.
 *  PlatformServiceCode.EDUCATION/FORUM, subscribable=true, et OrganizationServiceEntitlementWebFilter
 *  qui applique le gate génériquement à tout service résolu par PlatformServiceRouteResolver — un
 *  commentaire précédent affirmait à tort qu'ils ne l'étaient plus). */
export const ORG_MODE_REQUIRED_SERVICES = ['EDUCATION', 'NEWSLETTER', 'FORUM', 'HRM'] as const;

export type ActivateOrgResult =
  | { subscribed: true; session: AppSession }
  | { subscribed: false; effectiveServices: string[] };

export type OrgSubscriptionCheck =
  | { subscribed: true; effectiveServices: string[] }
  | { subscribed: false; effectiveServices: string[] };

/**
 * Vérifie si une organisation est utilisable en mode organisation (souscrite à au moins un des
 * `ORG_MODE_REQUIRED_SERVICES`). Lit via la session admin (pas le token de la personne qui agit) :
 * `GET /api/organizations/{id}/services` est gardé côté KSM par une autorité de niveau
 * admin/tenant — un simple employé (rôle ORGANIZATION-scoped, ex. EDUCATION_EDITOR_PERMISSIONS)
 * reçoit `Access Denied` sur cet appel. La souscription d'une org est une donnée de niveau
 * plateforme (pas une permission personnelle) : la lire via l'identité admin partagée est donc
 * légitime ici (lecture seule, aucun état sensible propagé). Réutilisé par
 * `activateOrganizationWorkspace` (login) et par le switch d'org en session (`/api/org/switch`).
 */
export async function checkOrgSubscription(
  organizationId: string,
  callerSession?: AppSession,
): Promise<OrgSubscriptionCheck> {
  // En tenant dédié, l'org n'est PAS visible par l'admin plateforme (autre tenant) : on lit alors
  // via la session de l'appelant (owner = admin de son tenant). L'admin plateforme reste le repli
  // pour les contextes plateforme (ex. souscription initiale d'une org du tenant plateforme).
  const adminSession = callerSession ?? (await getAdminSession());
  if (!adminSession) {
    logger.error({ organizationId }, 'ksm.org_activation.admin_session_unavailable');
    return { subscribed: false, effectiveServices: [] };
  }
  let services;
  try {
    services = await getOrganizationServices(adminSession, organizationId);
  } catch (cause) {
    // Token admin en cache mais invalidé côté KSM (ex. redémarrage avec régénération de la paire
    // de clés JWT) : le cache n'a aucun moyen de le détecter avant l'appel. Un seul retry après
    // invalidation suffit (le prochain getAdminSession() refait un login frais).
    if (cause instanceof HttpError && cause.status === 401) {
      logger.warn({ organizationId }, 'ksm.org_activation.admin_session_stale_retrying');
      invalidateAdminSession();
      const freshAdminSession = await getAdminSession();
      if (!freshAdminSession) {
        logger.error({ organizationId }, 'ksm.org_activation.admin_session_unavailable');
        return { subscribed: false, effectiveServices: [] };
      }
      try {
        services = await getOrganizationServices(freshAdminSession, organizationId);
      } catch (retryCause) {
        // Un 401 qui SURVIT à un login admin frais n'est pas une péremption de token : c'est un
        // refus côté KSM (ex. contexte d'organisation incohérent). Le laisser remonter tel quel
        // serait trompeur — le client mappe tout 401 sur « session expirée » et renvoie au login,
        // masquant la vraie cause. On le convertit en erreur explicite.
        if (retryCause instanceof HttpError && retryCause.status === 401) {
          logger.error({ organizationId, cause: retryCause }, 'ksm.org_activation.services_read_denied');
          throw new HttpError({
            status: 502,
            errorCode: 'ORG_SERVICES_UNAVAILABLE',
            message: "Impossible de vérifier l'abonnement de cette organisation auprès du serveur.",
          });
        }
        throw retryCause;
      }
    } else {
      throw cause;
    }
  }
  const hasRequiredService = ORG_MODE_REQUIRED_SERVICES.some((code) =>
    services.effectiveServices.includes(code),
  );
  return { subscribed: hasRequiredService, effectiveServices: services.effectiveServices };
}

/**
 * Vérifie la souscription de l'organisation puis, si elle est utilisable, construit et écrit la
 * session finale scopée à cette organisation (remplace la session lecteur/admin générique en
 * cours, nouveau `sid`). Sinon, ne modifie rien et signale au caller de rediriger vers l'écran de
 * souscription. Utilisé uniquement au login (mode organisation) — pour changer d'org en cours de
 * session sans réémettre de `sid`, voir `/api/org/switch` (patchSession).
 */
export async function activateOrganizationWorkspace(
  ownerSession: AppSession,
  org: OrgLoginOrganization,
): Promise<ActivateOrgResult> {
  // Services de l'org fournis par discover-contexts (dans le tenant de l'utilisateur) — source
  // primaire, pour NE PAS lire via l'admin plateforme (impossible si l'org est dans un tenant dédié).
  // Repli si absents : lecture via la session de l'utilisateur (owner = admin de son tenant).
  const fromDiscovery = org.services ?? [];
  const check: OrgSubscriptionCheck = fromDiscovery.length > 0
    ? { subscribed: ORG_MODE_REQUIRED_SERVICES.some((c) => fromDiscovery.includes(c)), effectiveServices: fromDiscovery }
    : await checkOrgSubscription(org.organizationId, ownerSession);
  if (!check.subscribed) {
    return { subscribed: false, effectiveServices: check.effectiveServices };
  }

  const session: AppSession = {
    ...ownerSession,
    sid: crypto.randomUUID(),
    workspace: {
      tenantId: ownerSession.workspace?.tenantId ?? ownerSession.user.tenantId ?? '',
      organizationId: org.organizationId,
      organizationCode: org.code,
      organizationName: org.displayName,
      // Login organisation explicite → marque la session en mode organisation.
      orgMode: true,
      // Services souscrits de l'org (bornent les rôles attribuables aux employés).
      services: check.effectiveServices,
    },
  };
  await writeSession(session);
  return { subscribed: true, session };
}
