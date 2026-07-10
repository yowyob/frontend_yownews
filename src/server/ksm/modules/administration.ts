import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';
import { serverEnv } from '@/env';

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

// Rôles factices proposés en MOCK_MODE — assez pour peupler l'écran d'assignation admin.
const MOCK_ROLES: AdminRole[] = [
  { id: 'role-edu-editor', tenantId: 'mock-tenant', code: ROLE_CODE_EDITOR, name: 'Rédacteur Éducation', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_EDITOR] },
  { id: 'role-edu-reader', tenantId: 'mock-tenant', code: ROLE_CODE_READER, name: 'Lecteur Éducation', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_READER] },
  { id: 'role-nl-editor', tenantId: 'mock-tenant', code: ROLE_CODE_NEWSLETTER_EDITOR, name: 'Rédacteur Newsletter', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_NEWSLETTER_EDITOR] },
  { id: 'role-nl-reader', tenantId: 'mock-tenant', code: ROLE_CODE_NEWSLETTER_READER, name: 'Lecteur Newsletter', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_NEWSLETTER_READER] },
];

// Utilisateurs factices — le compte connecté (admin) + quelques profils lecteur/rédacteur
// pour montrer la table et permettre de tester l'assignation/révocation de rôles.
const MOCK_USERS: AdminUser[] = [
  {
    userId: 'mock-user-id', email: 'demo@yowyob-edu.com', username: 'demo', status: 'ACTIVE',
    createdAt: '2026-01-05T09:00:00.000Z', firstName: 'Demo', lastName: 'YowYob',
    roles: [{ assignmentId: 'assign-1', roleId: 'role-edu-editor', code: ROLE_CODE_EDITOR, name: 'Rédacteur Éducation', scopeType: 'ORGANIZATION' }],
  },
  {
    userId: 'mock-user-2', email: 'aicha.diallo@example.com', username: 'aicha.diallo', status: 'ACTIVE',
    createdAt: '2026-02-11T14:30:00.000Z', firstName: 'Aïcha', lastName: 'Diallo',
    roles: [{ assignmentId: 'assign-2', roleId: 'role-edu-reader', code: ROLE_CODE_READER, name: 'Lecteur Éducation', scopeType: 'ORGANIZATION' }],
  },
  {
    userId: 'mock-user-3', email: 'kwame.mensah@example.com', username: 'kwame.mensah', status: 'ACTIVE',
    createdAt: '2026-03-02T08:15:00.000Z', firstName: 'Kwame', lastName: 'Mensah',
    roles: [],
  },
  {
    userId: 'mock-user-4', email: 'fatou.ndiaye@example.com', username: 'fatou.ndiaye', status: 'PENDING',
    createdAt: '2026-04-18T11:45:00.000Z', firstName: 'Fatou', lastName: 'Ndiaye',
    roles: [],
  },
];

export function listTenantUsers(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_USERS);
  return callKsm<AdminUser[]>('/api/administration/users', { method: 'GET' }, { session });
}

export function listRoles(session: AppSession) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_ROLES);
  return callKsm<AdminRole[]>('/api/administration/roles', { method: 'GET' }, { session });
}

/** Assigne un rôle (scope ORGANIZATION : l'org est résolue par callKsm via X-Organization-Id). */
export function assignRole(session: AppSession, userId: string, roleId: string) {
  if (serverEnv.MOCK_MODE) {
    const user = MOCK_USERS.find((u) => u.userId === userId);
    const role = MOCK_ROLES.find((r) => r.id === roleId);
    if (user && role && !user.roles.some((r) => r.roleId === roleId)) {
      user.roles.push({ assignmentId: `assign-${Date.now()}`, roleId: role.id, code: role.code, name: role.name, scopeType: role.scopeType });
    }
    return Promise.resolve(null);
  }
  return callKsm<unknown>(
    `/api/administration/users/${userId}/roles`,
    { method: 'POST', body: { roleId, scope: 'ORGANIZATION' } },
    { session },
  );
}

export function revokeRole(session: AppSession, userId: string, assignmentId: string) {
  if (serverEnv.MOCK_MODE) {
    const user = MOCK_USERS.find((u) => u.userId === userId);
    if (user) user.roles = user.roles.filter((r) => r.assignmentId !== assignmentId);
    return Promise.resolve(null);
  }
  return callKsm<unknown>(
    `/api/administration/users/${userId}/roles/${assignmentId}`,
    { method: 'DELETE' },
    { session },
  );
}
