// Rôles attribuables aux employés d'une organisation (mode org yownews).
//
// Chaque rôle est UNITAIRE et rattaché à un module. L'owner choisit le rôle qu'il attribue ; la liste
// proposée est bornée par les services souscrits de l'org (EDUCATION → rôles éducation ; FORUM → rôles
// forum). On ne liste QUE des rôles réels (dotés d'un set de permissions + template côté
// AdministrationApplicationService) : `FORUM_EDITOR_PERMISSIONS` est déclaré mais VIDE → exclu.
export type OrgRoleModule = 'EDUCATION' | 'FORUM';
export type OrgRoleOption = { code: string; label: string; module: OrgRoleModule };

export const ORG_ROLE_OPTIONS: OrgRoleOption[] = [
  { code: 'EDUCATION_EDITOR_PERMISSIONS', label: 'Rédacteur (Éducation)', module: 'EDUCATION' },
  { code: 'EDUCATION_MANAGER', label: 'Modérateur (Éducation)', module: 'EDUCATION' },
  { code: 'FORUM_USER_PERMISSIONS', label: 'Membre communauté (Forum)', module: 'FORUM' },
  { code: 'FORUM_MANAGER', label: 'Modérateur (Forum)', module: 'FORUM' },
];

const ORG_ROLE_BY_CODE: Record<string, OrgRoleOption> = Object.fromEntries(
  ORG_ROLE_OPTIONS.map((o) => [o.code, o]),
);

/** Options filtrées par les services souscrits de l'organisation. */
export function orgRoleOptionsForServices(services: string[] | undefined): OrgRoleOption[] {
  const s = services ?? [];
  return ORG_ROLE_OPTIONS.filter((o) => s.includes(o.module));
}

/** Un code de rôle est-il attribuable au vu des services souscrits ? (rôle réel + module souscrit) */
export function isRoleAssignable(code: string, services: string[] | undefined): boolean {
  const opt = ORG_ROLE_BY_CODE[code];
  return !!opt && (services ?? []).includes(opt.module);
}

/** Libellé métier d'un rôle d'après son code (roleName renvoyé par KSM). */
export function orgRoleLabel(code?: string | null): string {
  if (!code) return '—';
  return ORG_ROLE_BY_CODE[code]?.label ?? code;
}
