import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module administration renvoie l'enveloppe ApiResponse → callKsm (sans raw) déballe `.data`.

export type AdminRoleRef = {
  assignmentId: string;
  roleId: string;
  code: string | null;
  name: string | null;
  scopeType: string | null;
};

export type AdminUser = {
  userId: string;
  email: string;
  username: string;
  status: string;
  createdAt: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: AdminRoleRef[];
};

export type AdminRole = {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  scopeType: string;
  permissions: string[];
};

// Codes de rôle RBAC du module education.
export const ROLE_CODE_EDITOR = 'EDUCATION_EDITOR_PERMISSIONS';
export const ROLE_CODE_READER = 'EDUCATION_READER_PERMISSIONS';
// Codes de rôle RBAC du module newsletter.
export const ROLE_CODE_NEWSLETTER_EDITOR = 'NEWSLETTER_EDITOR';
export const ROLE_CODE_NEWSLETTER_READER = 'NEWSLETTER_READER';

export function listTenantUsers(session: AppSession) {
  return callKsm<AdminUser[]>('/api/administration/users', { method: 'GET' }, { session });
}

export function listRoles(session: AppSession) {
  return callKsm<AdminRole[]>('/api/administration/roles', { method: 'GET' }, { session });
}

/** Assigne un rôle (scope ORGANIZATION : l'org est résolue par callKsm via X-Organization-Id). */
export function assignRole(session: AppSession, userId: string, roleId: string) {
  return callKsm<unknown>(
    `/api/administration/users/${userId}/roles`,
    { method: 'POST', body: { roleId, scope: 'ORGANIZATION' } },
    { session },
  );
}

export function revokeRole(session: AppSession, userId: string, assignmentId: string) {
  return callKsm<unknown>(
    `/api/administration/users/${userId}/roles/${assignmentId}`,
    { method: 'DELETE' },
    { session },
  );
}
