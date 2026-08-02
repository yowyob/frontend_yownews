import 'server-only';
import { withAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees } from '@/server/ksm/modules/employees';
import { logger } from '@/server/logger';

// Résout des noms d'affichage à partir d'ids utilisateur via la logique employé (GET /api/employees
// de l'org plateforme, joint correctement par actorId — contrairement au UserProfileService KSM qui
// joint par id de compte). Best-effort : renvoie une Map vide si la session admin, l'org ou le
// lookup échoue (l'appelant retombe alors sur « Utilisateur »).
export async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const wanted = new Set(userIds.filter(Boolean));
  if (wanted.size === 0) return result;
  try {
    const orgId = await resolvePlatformOrganizationId();
    if (!orgId) return result;
    const res = await withAdminSession(async (admin) => ({
      employees: await listEmployees(admin, orgId),
      adminUser: admin.user,
    }));
    for (const e of res?.employees ?? []) {
      if (!wanted.has(e.userId)) continue;
      const name = [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || '';
      if (name) result.set(e.userId, name);
    }
    // L'owner/admin Yowyob Education n'a aucune adhésion employé (cf. listEmployees) : on le
    // reconnaît via l'identité de la session admin elle-même (c'est ce même compte). Repli sur son
    // username si firstName/lastName ne sont pas renseignés (cas courant pour ce compte).
    if (res?.adminUser.id && wanted.has(res.adminUser.id) && !result.has(res.adminUser.id)) {
      const full = [res.adminUser.firstName, res.adminUser.lastName].filter(Boolean).join(' ').trim();
      const name = full || res.adminUser.username || '';
      if (name) result.set(res.adminUser.id, name);
    }
  } catch (cause) {
    logger.error({ cause }, 'forum.resolve_user_names_failed');
  }
  return result;
}
