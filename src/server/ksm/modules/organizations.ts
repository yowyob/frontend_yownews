import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module organizations renvoie l'enveloppe ApiResponse → callKsm (sans raw) déballe `.data`.

export type OrganizationResponse = {
  id: string;
  tenantId: string;
  businessActorId: string;
  code: string;
  service?: string; // organizationType, stocké sous ce nom côté KSM
  organizationType?: string;
  email?: string | null;
  shortName?: string;
  displayName?: string;
  longName?: string;
  legalName?: string;
  description?: string | null;
  isActive: boolean;
  status: string;
};

/** Organisations possédées par l'utilisateur courant (ownership via businessActorId).
 *  `organizationId: null` explicite : cet endpoint est tenant-scope, pas org-scope — le
 *  contexte peut appartenir à une organisation/tenant sans rapport avec l'org plateforme
 *  (ex. login mode organisation), il ne faut jamais y injecter le fallback org plateforme. */
export function listMyOrganizations(session: AppSession) {
  return callKsm<OrganizationResponse[]>('/api/organizations/my', { method: 'GET', organizationId: null }, { session });
}

export type OrganizationServicesResponse = {
  organizationId: string;
  subscribedServices: string[];
  effectiveServices: string[];
};

/** Services souscrits par une organisation. Lecture de niveau **plateforme** : l'organisation
 *  concernée est déjà portée par l'URL, il ne faut donc **pas** l'injecter aussi en
 *  `X-Organization-Id`. C'est `organizationId: null` explicite, pour la même raison que
 *  `listMyOrganizations` ci-dessus : l'appelant est la session admin plateforme, dont le token
 *  est lié à l'org **plateforme** (cf. `admin-session.ts` `selectContext(..., ctx.organizations[0])`).
 *  Envoyer `X-Organization-Id: <org externe du owner>` avec ce token produisait une contradiction
 *  entre la revendication d'org du token et l'en-tête, que le gate kernel rejetait en 401 — ce qui
 *  cassait tout le mode organisation dès la sélection d'une org (le client mappait ce 401 sur
 *  « session expirée » et renvoyait au login). */
export function getOrganizationServices(session: AppSession, organizationId: string) {
  return callKsm<OrganizationServicesResponse>(
    `/api/organizations/${organizationId}/services`,
    { method: 'GET', organizationId: null },
    { session },
  );
}

/** Souscrit un service (ex. HRM, requis pour inviter des employés) à une organisation. */
export function subscribeService(
  session: AppSession,
  organizationId: string,
  serviceCode: string,
  quota: { requestQuotaLimit?: number; requestQuotaWindowSeconds?: number } = {},
) {
  return callKsm<OrganizationServicesResponse>(
    `/api/organizations/${organizationId}/services`,
    {
      method: 'POST',
      body: {
        serviceCode,
        requestQuotaLimit: quota.requestQuotaLimit ?? 10000,
        requestQuotaWindowSeconds: quota.requestQuotaWindowSeconds ?? 3600,
      },
      organizationId,
    },
    { session },
  );
}

export type BusinessActorOnboardingInput = {
  code: string;
  isIndividual: boolean;
  type: string;
  role: string;
  name: string;
  biography?: string;
};

export type BusinessActorResponse = { id: string };

/** Onboarding d'un business actor (requis avant de pouvoir créer une organisation).
 *  `organizationId: null` explicite : aucune org n'existe encore à ce stade, le fallback
 *  org plateforme n'a pas de sens ici (cf. listMyOrganizations ci-dessus). */
export function onboardBusinessActor(session: AppSession, input: BusinessActorOnboardingInput) {
  return callKsm<BusinessActorResponse>(
    '/api/actors/onboarding',
    { method: 'POST', body: input, organizationId: null },
    { session },
  );
}

export type CreateOrganizationInput = {
  businessActorId: string;
  code: string;
  organizationType: string;
  isIndividualBusiness: boolean;
  email?: string;
  displayName: string;
  legalName: string;
  description?: string;
};

/** Crée une organisation ; le tenant cible est celui de la session (header X-Tenant-Id).
 *  Naît en `PENDING_APPROVAL` — inutilisable tant que `approveOrganization` n'a pas été
 *  appelé (cf. guide KSM §5.4). */
export function createOrganization(session: AppSession, input: CreateOrganizationInput) {
  return callKsm<OrganizationResponse>(
    '/api/organizations',
    { method: 'POST', body: input, organizationId: null },
    { session },
  );
}

/** Approuve une organisation en PENDING_APPROVAL. Un owner possède `tenant:admin` sur son
 *  tenant (via le rôle OWNER) et peut donc approuver sa propre organisation.
 *  `organizationId: null` explicite (et non simplement omis) : sans ça, callKsm retombait sur
 *  le fallback org plateforme au lieu de n'envoyer aucun X-Organization-Id, contrairement à
 *  l'intention documentée ici et à l'exemple curl du guide KSM. */
export function approveOrganization(session: AppSession, organizationId: string, reason?: string) {
  return callKsm<OrganizationResponse>(
    `/api/organizations/${organizationId}/approve`,
    { method: 'POST', body: { reason: reason ?? 'Auto-approbation organisation freelance' }, organizationId: null },
    { session },
  );
}
