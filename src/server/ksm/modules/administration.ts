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

// Le DTO KSM `AdministrationUserResponse` (record Java) sérialise l'id du compte sous le champ
// `id` (comme tous les autres DTOs administration — cf. AdministrationRoleResponse), pas `userId`.
// On le renomme ici, au point d'entrée BFF, pour que tout le reste du frontend (ContentModeration,
// /admin/users, assignRole/revokeRole) puisse utiliser `userId` sans jamais lire `undefined`.
type KsmAdminUserResponse = Omit<AdminUser, 'userId'> & { id: string };

function normalizeAdminUser(u: KsmAdminUserResponse): AdminUser {
  const { id, ...rest } = u;
  return { ...rest, userId: id };
}

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
export const ROLE_CODE_EDUCATION_MANAGER = 'EDUCATION_MANAGER';
// Codes de rôle RBAC du module newsletter.
export const ROLE_CODE_NEWSLETTER_EDITOR = 'NEWSLETTER_EDITOR';
export const ROLE_CODE_NEWSLETTER_READER = 'NEWSLETTER_READER';
export const ROLE_CODE_NEWSLETTER_MANAGER = 'NEWSLETTER_MANAGER';
// Codes de rôle RBAC du module forum.
export const ROLE_CODE_FORUM_MANAGER = 'FORUM_MANAGER';
export const ROLE_CODE_FORUM_USER = 'FORUM_USER_PERMISSIONS';
// Rôle tenant-scope requis pour créer une organisation (`organizations:write`) — cf. guide KSM.
export const ROLE_CODE_OWNER = 'OWNER';

/** Rôles owner par module — le plus élevé hors rôle plateforme (SUPER_EDUCATION_SERVICES_MANAGER). */
export const OWNER_ROLE_CODES = [
  ROLE_CODE_EDUCATION_MANAGER,
  ROLE_CODE_NEWSLETTER_MANAGER,
  ROLE_CODE_FORUM_MANAGER,
] as const;

// Rôles factices proposés en MOCK_MODE — assez pour peupler l'écran d'assignation admin.
const MOCK_ROLES: AdminRole[] = [
  { id: 'role-edu-editor', tenantId: 'mock-tenant', code: ROLE_CODE_EDITOR, name: 'Rédacteur Éducation', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_EDITOR] },
  { id: 'role-edu-reader', tenantId: 'mock-tenant', code: ROLE_CODE_READER, name: 'Lecteur Éducation', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_READER] },
  { id: 'role-nl-editor', tenantId: 'mock-tenant', code: ROLE_CODE_NEWSLETTER_EDITOR, name: 'Rédacteur Newsletter', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_NEWSLETTER_EDITOR] },
  { id: 'role-nl-reader', tenantId: 'mock-tenant', code: ROLE_CODE_NEWSLETTER_READER, name: 'Lecteur Newsletter', scopeType: 'ORGANIZATION', permissions: [ROLE_CODE_NEWSLETTER_READER] },
];

// Utilisateurs factices — le compte connecté (admin) + quelques profils lecteur/rédacteur
// pour montrer la table et permettre de tester l'assignation/révocation de rôles. Inclut aussi
// les 3 personas du sélecteur de rôle MOCK_MODE (mock-session.ts, `mock-user-${role}`) — sans
// eux, tout contenu auto-créé/soumis par le compte de démo affichait un id tronqué au lieu du
// nom dans la colonne Auteur (aucune correspondance dans /api/admin/users).
const MOCK_USERS: AdminUser[] = [
  {
    userId: 'mock-user-admin', email: 'admin-demo@yowyob-edu.com', username: 'admin-demo', status: 'ACTIVE',
    createdAt: '2026-01-01T09:00:00.000Z', firstName: 'Demo', lastName: 'Admin', roles: [],
  },
  {
    userId: 'mock-user-editor', email: 'editor-demo@yowyob-edu.com', username: 'editor-demo', status: 'ACTIVE',
    createdAt: '2026-01-01T09:00:00.000Z', firstName: 'Demo', lastName: 'Rédacteur',
    roles: [{ assignmentId: 'assign-editor-demo', roleId: 'role-edu-editor', code: ROLE_CODE_EDITOR, name: 'Rédacteur Éducation', scopeType: 'ORGANIZATION' }],
  },
  {
    userId: 'mock-user-reader', email: 'reader-demo@yowyob-edu.com', username: 'reader-demo', status: 'ACTIVE',
    createdAt: '2026-01-01T09:00:00.000Z', firstName: 'Demo', lastName: 'Lecteur', roles: [],
  },
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

export async function listTenantUsers(session: AppSession) {
  if (serverEnv.MOCK_MODE) return MOCK_USERS;
  const users = await callKsm<KsmAdminUserResponse[]>('/api/administration/users', { method: 'GET' }, { session });
  return users.map(normalizeAdminUser);
}

/** `organizationId` explicite requis pour cibler une org différente de celle du workspace de `session`
 *  (ex. identité admin agissant sur l'organisation freelance d'un tiers). Omis (`undefined`) : hérite
 *  du contexte de `session` (comportement historique). `null` explicite : force l'absence totale de
 *  contexte d'org (résolution tenant-scope pure, ex. le rôle OWNER) — même si `session` porte déjà un
 *  `workspace.organizationId` (ex. l'admin plateforme), qui ne doit jamais fuiter dans cet appel. */
export function listRoles(session: AppSession, organizationId?: string | null) {
  if (serverEnv.MOCK_MODE) return Promise.resolve(MOCK_ROLES);
  return callKsm<AdminRole[]>('/api/administration/roles', { method: 'GET', organizationId }, { session });
}

/** Provisionne les rôles template du tenant/org courant (dont les rôles Manager par module). */
export function provisionDefaultRoles(session: AppSession, organizationId: string) {
  return callKsm<AdminRole[]>(
    '/api/administration/roles/defaults',
    { method: 'POST', organizationId },
    { session },
  );
}

/** Résout le roleId d'un template par son code. `organizationId: null` explicite pour une
 *  résolution tenant-scope pure (ex. le rôle OWNER, qui n'est lié à aucune organisation) —
 *  voir la note sur `listRoles` : `undefined` hériterait à tort du contexte d'org de `session`. */
export async function findRoleIdByCode(
  session: AppSession,
  organizationId: string | null | undefined,
  code: string,
): Promise<string | null> {
  const roles = await listRoles(session, organizationId);
  return roles.find((r) => r.code === code)?.id ?? null;
}

/**
 * Assigne un rôle à un utilisateur. `scopeType`:
 * - `'ORGANIZATION'` (défaut, comportement historique) : `organizationId` explicite requis pour
 *   agir sur une organisation différente de celle du workspace de `session` (identité admin
 *   transverse) ; envoie `X-Organization-Id` et `scopeId`.
 * - `'TENANT'` : rôle de portée tenant (ex. OWNER) — aucun `scopeId`/`X-Organization-Id`, cf.
 *   guide KSM "Devenir OWNER" (POST .../roles avec `{roleId, scopeType:"TENANT", scope:"TENANT"}`,
 *   sans `scopeId`).
 */
export function assignRole(
  session: AppSession,
  userId: string,
  roleId: string,
  organizationId?: string | null,
  scopeType: 'ORGANIZATION' | 'TENANT' = 'ORGANIZATION',
) {
  if (serverEnv.MOCK_MODE) {
    const user = MOCK_USERS.find((u) => u.userId === userId);
    const role = MOCK_ROLES.find((r) => r.id === roleId);
    if (user && role && !user.roles.some((r) => r.roleId === roleId)) {
      user.roles.push({ assignmentId: `assign-${Date.now()}`, roleId: role.id, code: role.code, name: role.name, scopeType: role.scopeType });
    }
    return Promise.resolve(null);
  }
  if (scopeType === 'TENANT') {
    // organizationId: null forcé — un rôle TENANT ne doit jamais porter de contexte d'org,
    // même si `session` (ex. l'admin plateforme) a par ailleurs un workspace.organizationId réel.
    return callKsm<unknown>(
      `/api/administration/users/${userId}/roles`,
      { method: 'POST', body: { roleId, scopeType: 'TENANT', scope: 'TENANT' }, organizationId: null },
      { session },
    );
  }
  return callKsm<unknown>(
    `/api/administration/users/${userId}/roles`,
    {
      method: 'POST',
      body: { roleId, scopeType: 'ORGANIZATION', scopeId: organizationId, scope: 'ORGANIZATION' },
      organizationId,
    },
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
