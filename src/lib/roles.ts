export const ADMIN_ROLE = 'ROLE_SUPER_EDUCATION_SERVICES_MANAGER';
export const EDITOR_ROLE = 'ROLE_EDUCATION_EDITOR_PERMISSIONS';

/** Vrai si une des autorités correspond au rôle (après retrait du suffixe de scope `#...`). */
function hasRole(authorities: string[] | undefined, role: string): boolean {
  if (!authorities?.length) return false;
  return authorities.some((a) => a.split('#')[0] === role);
}

/**
 * Scope d'une autorité : le resolver backend suffixe le rôle par `#TENANT`, `#SYSTEM` ou
 * `#ORGANIZATION:<orgId>`. On ne renvoie que la classe de scope (`ORGANIZATION`, pas l'id).
 * Absence de suffixe → null (traité comme plateforme, cf. anciens tokens).
 */
function roleScope(authority: string): string | null {
  const suffix = authority.split('#')[1];
  return suffix ? suffix.split(':')[0] : null;
}

/** Vrai si une autorité porte ce rôle ET satisfait le prédicat de scope. */
function hasRoleWithScope(
  authorities: string[] | undefined,
  role: string,
  scopeOk: (scope: string | null) => boolean,
): boolean {
  if (!authorities?.length) return false;
  return authorities.some((a) => a.split('#')[0] === role && scopeOk(roleScope(a)));
}

/**
 * Détecte l'admin PLATEFORME (staff) : le rôle SUPER_EDUCATION_SERVICES_MANAGER au scope
 * TENANT/SYSTEM (ou sans suffixe, pour compat). Un owner d'organisation qui détient ce même rôle
 * en scope ORGANIZATION n'est PAS un admin plateforme (cf. isOrgAdmin) : il ne doit pas accéder
 * aux pages/API tenant-wide.
 */
export function isPlatformAdmin(authorities?: string[]): boolean {
  return hasRoleWithScope(authorities, ADMIN_ROLE, (s) => s === null || s === 'TENANT' || s === 'SYSTEM');
}

/**
 * Détecte l'admin d'ORGANISATION (owner en mode org) : SUPER_EDUCATION_SERVICES_MANAGER en scope
 * ORGANIZATION, ou l'un des rôles manager d'org (toujours ORGANIZATION-scopés).
 */
export function isOrgAdmin(authorities?: string[]): boolean {
  return hasRoleWithScope(authorities, ADMIN_ROLE, (s) => s === 'ORGANIZATION') || isOrganizationManager(authorities);
}

/**
 * Détecte l'éditeur education. Le rôle EDUCATION_EDITOR_PERMISSIONS est ORGANIZATION-scoped :
 * l'autorité injectée est `ROLE_EDUCATION_EDITOR_PERMISSIONS#ORGANIZATION:<orgId>` → on retire
 * le suffixe de scope avant comparaison.
 */
export function isEducationEditor(authorities?: string[]): boolean {
  return hasRole(authorities, EDITOR_ROLE);
}

// Rôles manager par module, attribués à l'owner d'une organisation connectée en mode
// organisation (cf. provisionOwnerRoles) — ORGANIZATION-scoped comme EDITOR_ROLE ci-dessus.
export const ORG_MANAGER_ROLES = [
  'ROLE_EDUCATION_MANAGER',
  'ROLE_NEWSLETTER_MANAGER',
  'ROLE_FORUM_MANAGER',
] as const;

/** Vrai si l'utilisateur détient au moins un rôle manager d'organisation (owner). */
export function isOrganizationManager(authorities?: string[]): boolean {
  return ORG_MANAGER_ROLES.some((role) => hasRole(authorities, role));
}

/**
 * En mode organisation, l'affichage des onglets suit les RÔLES de l'utilisateur (pas seulement les
 * services de l'org) : un rôle éducation (`ROLE_EDUCATION_*`) → onglet Éducation ; un rôle forum
 * (`ROLE_FORUM_*`) → onglet Forum. Le préfixe suffit (le suffixe de scope `#ORGANIZATION:…` n'y change
 * rien). NB : `SUPER_EDUCATION_SERVICES_MANAGER` devient `ROLE_SUPER_EDUCATION_…`, donc ne matche pas
 * `ROLE_EDUCATION_` — sans importance ici (réservé au staff plateforme, hors mode org).
 */
export function hasEducationRole(authorities?: string[]): boolean {
  return authorities?.some((a) => a.startsWith('ROLE_EDUCATION_')) ?? false;
}

export function hasForumRole(authorities?: string[]): boolean {
  return authorities?.some((a) => a.startsWith('ROLE_FORUM_')) ?? false;
}

/**
 * Libellé du badge de rôle affiché dans la sidebar, dérivé des autorités de la SESSION
 * (et non du variant du layout) : un admin reste « Administrateur » même sur /reader/*.
 */
export type RoleVariant = 'admin' | 'editor' | 'reader';

/**
 * Variant d'interface (sidebar) dérivé des autorités de la SESSION, pas de l'URL visitée :
 * un admin garde son menu admin même en consultant /reader/* ou /editor/*.
 */
export function roleVariant(authorities?: string[]): RoleVariant {
  // Variant « global » (hors mode org) : platform / editor / reader. NB : on n'élève PAS ici via
  // isOrgAdmin — un freelance possède aussi les rôles MANAGER et ne doit pas passer « admin ». Le
  // variant « admin » d'organisation est décidé dans les layouts, gardé par le marqueur orgMode
  // de la session (cf. modeVariant / editor+reader layouts).
  if (isPlatformAdmin(authorities)) return 'admin';
  if (isEducationEditor(authorities)) return 'editor';
  return 'reader';
}

/**
 * Variant à afficher selon le mode de session. En mode organisation, l'owner/admin (isOrgAdmin)
 * devient « admin » ; un employé rédacteur reste « editor ». Hors mode org, on retombe sur le
 * variant global (parcours freelance/normal inchangé).
 */
export function variantForMode(authorities: string[] | undefined, orgMode: boolean): RoleVariant {
  if (!orgMode) return roleVariant(authorities);
  if (isPlatformAdmin(authorities) || isOrgAdmin(authorities)) return 'admin';
  if (isEducationEditor(authorities)) return 'editor';
  return 'reader';
}

const VARIANT_LABEL: Record<RoleVariant, string> = { admin: 'Administrateur', editor: 'Rédacteur', reader: 'Lecteur' };

/** Libellé du badge pour un variant déjà calculé (mode-aware). */
export function roleBadgeLabelForVariant(variant: RoleVariant): string {
  return VARIANT_LABEL[variant];
}

/** Libellé du badge de rôle, cohérent avec roleVariant (variant global, hors mode org). */
export function roleBadgeLabel(authorities?: string[]): string {
  return VARIANT_LABEL[roleVariant(authorities)];
}

export const AppRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  AUTHOR: 'AUTHOR',
  USER: 'USER',
  ORGANISATION: 'ORGANISATION',
} as const;
