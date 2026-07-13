import 'server-only';
import { redis } from '@/server/redis';
import type { AppSession } from '@/lib/types/auth';

/**
 * Connexion "mode organisation" en 2 temps : la session déjà authentifiée de l'owner
 * (obtenue via ses propres identifiants, potentiellement distincts du compte lecteur en
 * cours) reste côté serveur (Redis) le temps qu'il choisisse laquelle de ses organisations
 * activer — jamais exposée au navigateur, qui ne reçoit qu'un pendingId opaque.
 */

export type OrgLoginOrganization = {
  organizationId: string;
  code: string;
  displayName: string;
};

export type PendingOrgLogin = {
  ownerSession: AppSession;
  organizations: OrgLoginOrganization[];
};

const key = (id: string) => `app:org-login:pending:${id}`;

export async function saveOrgLoginPending(pending: PendingOrgLogin, ttlSeconds = 120): Promise<string> {
  const id = crypto.randomUUID();
  await redis().set(key(id), JSON.stringify(pending), 'EX', ttlSeconds);
  return id;
}

export async function peekOrgLoginPending(id: string): Promise<PendingOrgLogin | null> {
  const raw = await redis().get(key(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingOrgLogin;
  } catch {
    return null;
  }
}

export async function takeOrgLoginPending(id: string): Promise<PendingOrgLogin | null> {
  const pending = await peekOrgLoginPending(id);
  if (pending) await redis().del(key(id));
  return pending;
}
