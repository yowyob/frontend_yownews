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

export interface AppSession {
  sid: string;
  accessToken: string;
  user: SessionUser;
  workspace?: WorkspaceContext;
  expiresAt: number;
  forcePasswordChange?: boolean;
}

export type ClientSession = {
  user: SessionUser;
  workspace?: WorkspaceContext;
  forcePasswordChange: boolean;
  expiresAt: number;
};
