// Population « utilisateurs » de l'espace admin. UNE seule définition partagée par le dashboard,
// le badge de la sidebar et la page Utilisateurs : ces trois écrans affichaient des chiffres
// différents (tenant-wide vs adhésions) parce que chacun recomptait de son côté.
//
// La référence est l'ADHÉSION à l'organisation plateforme (/api/admin/members) : dans le modèle
// invitation-only, un compte du tenant jamais invité n'existe pas pour l'admin Yowyob Education.
// /api/admin/users reste nécessaire en complément — lui seul porte les rôles RBAC (assignmentId).

// Codes de rôle RBAC education (cf. templates KSM). Deux rôles seulement : Rédacteur / Lecteur.
// Doublons volontaires de ROLE_CODE_READER (src/server/ksm/modules/administration.ts), inaccessible
// ici car marqué `server-only`.
export const ROLE_EDITOR = 'EDUCATION_EDITOR_PERMISSIONS';
export const ROLE_READER = 'EDUCATION_READER_PERMISSIONS';

export type RoleRef = { assignmentId: string; roleId: string; code: string | null; name: string | null; scopeType: string | null };

/** Compte du tenant renvoyé par /api/admin/users — porteur des rôles RBAC. */
export type TenantUser = {
  userId: string; email: string; username: string; status: string; createdAt: string | null;
  firstName: string | null; lastName: string | null; roles: RoleRef[];
};

/** Membre de l'org (adhésion) renvoyé par /api/admin/members. */
export type Member = {
  id: string; userId: string; email: string; firstName: string | null; lastName: string | null;
  roleName: string | null; status: string; photoId: string | null;
};

/** Vue fusionnée affichée : l'adhésion (statut + membershipId + photo) enrichie des rôles RBAC
 *  (assignmentId, pour le changement/révocation de rôle) résolus par userId. */
export type AdminUser = {
  userId: string; membershipId: string; email: string; username: string;
  membershipStatus: string; createdAt: string | null;
  firstName: string | null; lastName: string | null; photoId: string | null; roles: RoleRef[];
  /** Nom du rôle d'adhésion (employee_membership.role_id), indépendant du RBAC ci-dessus.
   *  Utilisé en fallback d'affichage + diagnostic quand `roles` est vide alors que ce champ ne l'est pas. */
  roleName: string | null;
};

export type RoleKind = 'editor' | 'reader' | 'admin' | 'none';

/** Fusionne les membres de l'org avec les rôles RBAC (par userId). Seuls les membres invités
 *  apparaissent (les comptes du tenant jamais invités sont ignorés). */
export function mergeMembers(members: Member[], tenantUsers: TenantUser[]): AdminUser[] {
  const byId = new Map(tenantUsers.map((u) => [u.userId, u]));
  return members.map((m) => {
    const tu = byId.get(m.userId);
    const rbacRoles = tu?.roles ?? [];
    if (rbacRoles.length === 0 && m.roleName) {
      // Diagnostic : l'adhésion (employee_membership.role_id) porte un rôle, mais aucun rôle RBAC
      // n'est résolu pour cet utilisateur (/api/administration/users) — la colonne "Rôle" de l'UI
      // affichera un fallback sur m.roleName au lieu de "Aucun rôle" tant que ceci se produit.
      console.warn('[admin-members] mismatch adhésion/RBAC', { userId: m.userId, membershipRoleName: m.roleName, rbacFound: Boolean(tu) });
    }
    return {
      userId: m.userId,
      membershipId: m.id,
      email: m.email || tu?.email || '',
      username: tu?.username ?? '',
      membershipStatus: m.status,
      createdAt: tu?.createdAt ?? null,
      firstName: m.firstName ?? tu?.firstName ?? null,
      lastName: m.lastName ?? tu?.lastName ?? null,
      photoId: m.photoId ?? null,
      roles: rbacRoles,
      roleName: m.roleName ?? null,
    };
  });
}

export function roleKind(u: AdminUser): RoleKind {
  const codes = u.roles.map((r) => r.code);
  if (codes.includes(ROLE_EDITOR)) return 'editor';
  if (codes.includes(ROLE_READER)) return 'reader';
  if (codes.some((c) => c === 'SUPER_EDUCATION_SERVICES_MANAGER' || c === 'EDUCATION_MANAGER')) return 'admin';
  return 'none';
}
