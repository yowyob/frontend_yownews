export interface SessionUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  permissions?: string[];
  tenantId?: string;
}

export interface WorkspaceContext {
  tenantId: string;
  organizationId?: string;
  organizationCode?: string;
  organizationName?: string;
  agencyId?: string;
}

/** Organisation que l'utilisateur peut activer (owner ou simple employé) — cf. discover-contexts,
 *  qui fusionne déjà côté KSM les deux (UserOrganizationAccessDirectory.listUserOrganizations). */
export interface AccessibleOrganization {
  organizationId: string;
  code: string;
  displayName: string;
}

export interface AppSession {
  sid: string;
  accessToken: string;
  user: SessionUser;
  workspace?: WorkspaceContext;
  /** Organisations accessibles (owned+member) au moment du login — sert au switch d'org en session
   *  (`/api/org/switchable`, `/api/org/switch`) sans re-login. Absent pour les sessions mock/legacy. */
  accessibleOrganizations?: AccessibleOrganization[];
  expiresAt: number;
  forcePasswordChange?: boolean;
}

export type ClientSession = {
  user: SessionUser;
  workspace?: WorkspaceContext;
  forcePasswordChange: boolean;
  expiresAt: number;
};
