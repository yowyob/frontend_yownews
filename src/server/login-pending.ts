import 'server-only';
import { redis } from '@/server/redis';
import type { AppSession } from '@/lib/types/auth';
import type { ContextualLoginResponse, UserOrganizationAccess } from '@/server/ksm/modules/auth';

// Organisation unique + accès sur invitation : plus de login en 2 temps (sélection d'org). On garde
// un pending « Rejoindre » : après un login d'un compte non-membre, on ne renvoie qu'un pendingId
// opaque ; l'email (nécessaire pour émettre l'invitation) reste côté serveur, borné dans le temps.
export type PendingJoin = { email: string };
const joinKey = (id: string) => `app:login:join:${id}`;

export async function saveJoinPending(pending: PendingJoin, ttlSeconds: number): Promise<string> {
  const id = crypto.randomUUID();
  const ttl = Math.max(30, Math.min(ttlSeconds, 300));
  await redis().set(joinKey(id), JSON.stringify(pending), 'EX', ttl);
  return id;
}

export async function takeJoinPending(id: string): Promise<PendingJoin | null> {
  const raw = await redis().get(joinKey(id));
  if (!raw) return null;
  await redis().del(joinKey(id));
  try {
    return JSON.parse(raw) as PendingJoin;
  } catch {
    return null;
  }
}

export function orgDisplayName(org: UserOrganizationAccess): string {
  return org.displayName ?? org.shortName ?? org.longName ?? org.legalName ?? org.organizationCode ?? org.organizationId;
}

export function buildSession(contextual: ContextualLoginResponse): AppSession {
  const s = contextual.session;
  const selectedOrg = contextual.selectedOrganizationId
    ? s.organizations?.find((o) => o.organizationId === contextual.selectedOrganizationId)
    : undefined;
  return {
    sid: crypto.randomUUID(),
    accessToken: s.accessToken,
    expiresAt: Math.floor(Date.now() / 1000) + s.expiresInSeconds,
    ...(s.refreshToken
      ? {
          refreshToken: s.refreshToken,
          refreshExpiresAt: Math.floor(Date.now() / 1000) + (s.refreshExpiresInSeconds ?? 0),
        }
      : {}),
    forcePasswordChange: s.forcePasswordChange,
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
        ? {
            organizationId: contextual.selectedOrganizationId,
            ...(selectedOrg?.organizationCode ? { organizationCode: selectedOrg.organizationCode } : {}),
            ...(selectedOrg ? { organizationName: orgDisplayName(selectedOrg) } : {}),
          }
        : {}),
    },
    // Sert au switch d'org en session (/api/org/switchable, /api/org/switch) — owned+member déjà
    // fusionné côté KSM (UserOrganizationAccessDirectory.listUserOrganizations).
    accessibleOrganizations: (s.organizations ?? []).map((o) => ({
      organizationId: o.organizationId,
      code: o.organizationCode ?? o.organizationId,
      displayName: orgDisplayName(o),
      // Services souscrits (fournis par KSM dans le tenant de l'utilisateur) : évitent de relire les
      // services via l'admin plateforme lors d'un switch d'org (impossible en tenant dédié).
      services: o.services ?? [],
    })),
  };
}
