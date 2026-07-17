import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { HttpError } from '@/lib/types/api';
import { logger } from '@/server/logger';
import {
  listMyOrganizations,
  onboardBusinessActor,
  createOrganization,
  approveOrganization,
  subscribeService,
} from '@/server/ksm/modules/organizations';
import { provisionOwnerRoles } from '@/server/ksm/admin-session';

// Services souscrits par défaut pour une organisation freelance — HRM exclu (gestion RH
// d'entreprise, hors du modèle freelance/individuel). Sans cet appel explicite, l'organisation
// naît sans aucun service souscrit (provision-subscribable-services-on-create=false côté KSM,
// changement de politique documenté — plus d'abonnement automatique) : le owner ne peut alors
// créer aucun contenu Education/Newsletter/Forum (403 ORGANIZATION_SERVICE_NOT_SUBSCRIBED).
const FREELANCE_DEFAULT_SERVICES = ['EDUCATION', 'NEWSLETTER', 'FORUM'] as const;

/**
 * Souscrit les services par défaut manquants pour une organisation (best-effort, idempotent —
 * ne touche pas aux services déjà présents dans `currentServices`). Utilisé à la création d'une
 * org freelance, mais aussi en auto-réparation à chaque login pour un compte qui a déjà une org
 * (cf. login/route.ts) : sans ce second point d'appel, une org créée avant ce correctif — ou dont
 * la souscription avait échoué silencieusement — restait bloquée à vie, la logique de création
 * ne se redéclenchant jamais pour un compte qui a déjà au moins une organisation.
 */
export async function ensureOrgServicesSubscribed(
  session: AppSession,
  organizationId: string,
  currentServices: readonly string[] = [],
): Promise<void> {
  const missing = FREELANCE_DEFAULT_SERVICES.filter((svc) => !currentServices.includes(svc));
  for (const serviceCode of missing) {
    try {
      await subscribeService(session, organizationId, serviceCode);
    } catch (subscribeCause) {
      logger.error({ cause: subscribeCause, organizationId, serviceCode }, 'ksm.org.subscribe_service_failed');
    }
  }
}

function slugifyEmailLocalPart(email: string): string {
  const local = email.split('@')[0] ?? email;
  const slug = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'user';
}

function randomSuffix(): string {
  return Math.random().toString(16).slice(2, 6);
}

/**
 * Crée, en tâche de fond et de façon best-effort, une organisation freelance/personnelle pour
 * un utilisateur qui n'en possède encore aucune (vérifié via listMyOrganizations — idempotent,
 * ne recrée rien si une org existe déjà). Le tenant cible est celui de la session appelante
 * (X-Tenant-Id, résolu depuis session.workspace.tenantId) — pour un lecteur venant de se
 * connecter, il s'agit du tenant plateforme partagé (YOWYOB_EDU), pas d'un tenant dédié.
 *
 * N'importe quel échec est loggé mais ne doit jamais faire échouer le login du lecteur classique
 * (cf. "le flux normal de la plateforme est conservé").
 */
export async function ensureFreelanceOrganization(
  session: AppSession,
  user: { email: string; firstName?: string; lastName?: string; username?: string },
): Promise<void> {
  try {
    const existing = await listMyOrganizations(session);
    if (existing.length > 0) return;
  } catch (cause) {
    logger.error({ cause }, 'ksm.freelance_org.list_failed');
    return;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.username ||
    user.email;

  let actorId: string;
  try {
    const actor = await onboardBusinessActor(session, {
      code: `FREELANCE-${randomSuffix()}${randomSuffix()}`,
      isIndividual: true,
      type: 'FREELANCE_OWNER',
      role: 'OWNER',
      name: displayName,
      biography: `Espace personnel de ${displayName}`,
    });
    actorId = actor.id;
  } catch (cause) {
    logger.error({ cause, email: user.email }, 'ksm.freelance_org.actor_onboarding_failed');
    return;
  }

  // Le code d'org est dérivé de l'email pour qu'une collision (409 ORGANIZATION_CODE_DUPLICATE)
  // soit rattachable à "cet email/pseudo est déjà pris" — un seul essai avec suffixe aléatoire
  // avant d'abandonner silencieusement (best-effort, ne bloque jamais le login).
  const baseSlug = slugifyEmailLocalPart(user.email);
  const attempts = [baseSlug, `${baseSlug}-${randomSuffix()}`];

  for (const slug of attempts) {
    try {
      const org = await createOrganization(session, {
        businessActorId: actorId,
        code: `ORG-${slug}`,
        organizationType: 'FREELANCE',
        isIndividualBusiness: true,
        email: user.email,
        displayName,
        legalName: displayName,
        description: `Organisation personnelle de ${displayName}`,
      });
      // L'org naît en PENDING_APPROVAL (cf. guide KSM §5.4) — l'owner possède déjà
      // tenant:admin (via le rôle OWNER attribué à la vérification email) et peut
      // donc approuver sa propre organisation, avec le même token.
      await approveOrganization(session, org.id);
      await provisionOwnerRoles(org.id, session.user.id);
      await ensureOrgServicesSubscribed(session, org.id);
      return;
    } catch (cause) {
      if (cause instanceof HttpError && cause.errorCode === 'ORGANIZATION_CODE_DUPLICATE') {
        logger.warn({ email: user.email, slug }, 'ksm.freelance_org.code_collision');
        continue;
      }
      logger.error({ cause, email: user.email }, 'ksm.freelance_org.create_failed');
      return;
    }
  }

  logger.error({ email: user.email }, 'ksm.freelance_org.create_failed_after_retry');
}
