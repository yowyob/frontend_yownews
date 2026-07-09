'use client';
import { useSession } from '@/components/providers/session-provider';

const basePerm = (p: string) => p.split('#')[0]!;

export function useCan(required: string | string[]): boolean {
  const { session } = useSession();
  if (!session) return false;
  const owned = new Set((session.user.permissions ?? []).map(basePerm));
  const list = Array.isArray(required) ? required : [required];
  return list.some((perm) => owned.has(perm));
}

export function useCanAll(required: string[]): boolean {
  const { session } = useSession();
  if (!session) return false;
  const owned = new Set((session.user.permissions ?? []).map(basePerm));
  return required.every((perm) => owned.has(perm));
}

export function useHasRole(roles: string | string[]): boolean {
  const { session } = useSession();
  if (!session) return false;
  const owned = new Set(session.user.roles ?? []);
  const list = Array.isArray(roles) ? roles : [roles];
  return list.some((role) => owned.has(role));
}
