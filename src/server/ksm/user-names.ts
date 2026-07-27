import 'server-only';
import { getAdminSession } from '@/server/ksm/admin-session';
import { listTenantUsers } from '@/server/ksm/modules/administration';
import { logger } from '@/server/logger';

// Résout des noms d'affichage à partir d'ids utilisateur (join actor_id → vrais firstName/lastName
// via la session admin). Best-effort : renvoie une Map vide si la session admin ou le lookup échoue
// (l'appelant retombe alors sur « Utilisateur »). Un seul appel `listTenantUsers` couvre tous les ids.
export async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const wanted = new Set(userIds.filter(Boolean));
  if (wanted.size === 0) return result;
  try {
    const admin = await getAdminSession();
    if (!admin) return result;
    const users = await listTenantUsers(admin);
    for (const u of users) {
      if (!wanted.has(u.userId)) continue;
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || '';
      if (name) result.set(u.userId, name);
    }
  } catch (cause) {
    logger.error({ cause }, 'forum.resolve_user_names_failed');
  }
  return result;
}
