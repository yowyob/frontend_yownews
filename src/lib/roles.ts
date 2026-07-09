export const ADMIN_ROLE = 'ROLE_SUPER_EDUCATION_SERVICES_MANAGER';
export const EDITOR_ROLE = 'ROLE_EDUCATION_EDITOR_PERMISSIONS';

/** Vrai si une des autorités correspond au rôle (après retrait du suffixe de scope `#...`). */
function hasRole(authorities: string[] | undefined, role: string): boolean {
  if (!authorities?.length) return false;
  return authorities.some((a) => a.split('#')[0] === role);
}

/**
 * Détecte l'admin plateforme via le nom de rôle présent dans les autorités du token.
 * Le resolver backend (RolesPermissionResolver) ajoute `ROLE_<CODE>` (+ `#TENANT`) aux
 * autorités pour tout rôle SYSTEM/TENANT. On retire le suffixe de scope avant comparaison.
 */
export function isPlatformAdmin(authorities?: string[]): boolean {
  return hasRole(authorities, ADMIN_ROLE);
}

/**
 * Détecte l'éditeur education. Le rôle EDUCATION_EDITOR_PERMISSIONS est ORGANIZATION-scoped :
 * l'autorité injectée est `ROLE_EDUCATION_EDITOR_PERMISSIONS#ORGANIZATION:<orgId>` → on retire
 * le suffixe de scope avant comparaison.
 */
export function isEducationEditor(authorities?: string[]): boolean {
  return hasRole(authorities, EDITOR_ROLE);
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
  if (isPlatformAdmin(authorities)) return 'admin';
  if (isEducationEditor(authorities)) return 'editor';
  return 'reader';
}

/** Libellé du badge de rôle, cohérent avec roleVariant. */
export function roleBadgeLabel(authorities?: string[]): string {
  const labels: Record<RoleVariant, string> = { admin: 'Administrateur', editor: 'Rédacteur', reader: 'Lecteur' };
  return labels[roleVariant(authorities)];
}

export function roleSlug(roles?: string[], _permissions?: string[]): string {
  return roles?.[0]?.toLowerCase() ?? '';
}

export function isMigratedRole(slug: string): boolean {
  return !!slug;
}

export const AppRoles = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  AUTHOR: 'AUTHOR',
  USER: 'USER',
  ORGANISATION: 'ORGANISATION',
} as const;
