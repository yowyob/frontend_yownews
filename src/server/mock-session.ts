import 'server-only';
import { cookies } from 'next/headers';
import type { AppSession } from '@/lib/types/auth';
import { ADMIN_ROLE, EDITOR_ROLE } from '@/lib/roles';

/**
 * En MOCK_MODE, un cookie choisit quel rôle est simulé (voir /api/mock/role). Les 3 layouts
 * dérivent leur sidebar de session.user.roles (roleVariant) exactement comme en production —
 * c'est donc bien ce cookie, et non l'URL visitée, qui détermine la sidebar admin/rédacteur/
 * lecteur affichée. Sans cookie, on retombe sur 'admin' (comportement historique).
 */
export type MockRole = 'admin' | 'editor' | 'reader';
export const MOCK_ROLE_COOKIE = 'mock_role';

const PERSONAS: Record<MockRole, { firstName: string; lastName: string; email: string; username: string; roles: string[] }> = {
  admin: { firstName: 'Demo', lastName: 'Admin', email: 'admin-demo@yowyob-edu.com', username: 'admin-demo', roles: [ADMIN_ROLE] },
  editor: { firstName: 'Demo', lastName: 'Rédacteur', email: 'editor-demo@yowyob-edu.com', username: 'editor-demo', roles: [EDITOR_ROLE] },
  reader: { firstName: 'Demo', lastName: 'Lecteur', email: 'reader-demo@yowyob-edu.com', username: 'reader-demo', roles: [] },
};

export async function getMockRole(): Promise<MockRole> {
  const store = await cookies();
  const value = store.get(MOCK_ROLE_COOKIE)?.value;
  return value === 'editor' || value === 'reader' ? value : 'admin';
}

/**
 * @param forceRole Ignore le cookie et impose un rôle précis — utilisé par le compte de
 * service `getAdminSession()` (admin-session.ts), qui doit toujours agir en admin plateforme
 * quel que soit le rôle actuellement prévisualisé par le sélecteur de la Topbar.
 */
export async function getMockSession(forceRole?: MockRole): Promise<AppSession> {
  const role = forceRole ?? (await getMockRole());
  const persona = PERSONAS[role];
  return {
    sid: `mock-session-${role}`,
    accessToken: 'mock-access-token',
    user: {
      id: `mock-user-${role}`,
      email: persona.email,
      username: persona.username,
      firstName: persona.firstName,
      lastName: persona.lastName,
      roles: persona.roles,
      permissions: persona.roles,
      tenantId: 'mock-tenant',
    },
    workspace: {
      tenantId: 'mock-tenant',
      organizationId: 'mock-org',
      // Volontairement différent du code plateforme (KSM_PLATFORM_ORG_CODE, 'YOWYOB_EDU' par
      // défaut) : `/editor/my-org` et `/editor/org-publisher` n'affichent leur contenu réel
      // que pour une organisation externe — avec le code plateforme, ces pages restent
      // bloquées sur leur écran "sélectionnez votre organisation" même en mock.
      organizationCode: 'INSTITUT-DEMO',
      organizationName: 'Institut Panafricain (démo)',
    },
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    forcePasswordChange: false,
  };
}
