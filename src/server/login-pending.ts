import 'server-only';
import { redis } from '@/server/redis';
import type { AppSession } from '@/lib/types/auth';
import type { ContextualLoginResponse, UserOrganizationAccess } from '@/server/ksm/modules/auth';

/**
 * Login en 2 temps : quand le compte a plusieurs organisations, le selectionToken
 * KSM reste côté serveur (Redis) et le navigateur ne reçoit qu'un pendingId opaque
 * + la liste des orgs DU user (celles renvoyées par discover-contexts, jamais d'autres).
 */

export type PendingLogin = {
  selectionToken: string;
  contextId: string;
  organizations: UserOrganizationAccess[];
};

const key = (id: string) => `app:login:pending:${id}`;

export async function savePendingLogin(pending: PendingLogin, ttlSeconds: number): Promise<string> {
  const id = crypto.randomUUID();
  // Borne le TTL : jamais plus long que la validité du selectionToken KSM.
  const ttl = Math.max(30, Math.min(ttlSeconds, 300));
  await redis().set(key(id), JSON.stringify(pending), 'EX', ttl);
  return id;
}

export async function takePendingLogin(id: string): Promise<PendingLogin | null> {
  const raw = await redis().get(key(id));
  if (!raw) return null;
  await redis().del(key(id));
  try {
    return JSON.parse(raw) as PendingLogin;
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
  };
}
