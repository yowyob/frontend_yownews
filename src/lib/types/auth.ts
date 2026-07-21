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
  // Marqueur explicite du « mode organisation » : posé au login organisation
  // (activateOrganizationWorkspace) et conservé au switch d'org. Absent = mode freelance/normal.
  // Source de vérité du mode pour l'UI (badge, nav, profil) — NE PAS déduire des rôles.
  orgMode?: boolean;
  // Services souscrits par l'organisation active (EDUCATION, FORUM, …). Bornent les rôles que
  // l'owner peut attribuer à ses employés. L'affichage des onglets, lui, dépend des RÔLES de l'user.
  services?: string[];
}

/** Organisation que l'utilisateur peut activer (owner ou simple employé) — cf. discover-contexts,
 *  qui fusionne déjà côté KSM les deux (UserOrganizationAccessDirectory.listUserOrganizations). */
export interface AccessibleOrganization {
  organizationId: string;
  code: string;
  displayName: string;
  // Services souscrits (depuis discover-contexts) — sert au switch d'org sans relire via l'admin.
  services?: string[];
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
