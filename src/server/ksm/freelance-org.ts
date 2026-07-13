import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { HttpError } from '@/lib/types/api';
import { logger } from '@/server/logger';
import {
  listMyOrganizations,
  onboardBusinessActor,
  createOrganization,
  approveOrganization,
} from '@/server/ksm/modules/organizations';
import { provisionOwnerRoles } from '@/server/ksm/admin-session';

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
