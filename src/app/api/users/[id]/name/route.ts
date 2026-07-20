import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import { listTenantUsers } from '@/server/ksm/modules/administration';

// Nom d'affichage d'un utilisateur, résolu via la session admin (GET /api/administration/users, qui
// fait le bon join actor_id → vrai firstName/lastName). Accessible à tout viewer authentifié : ne
// renvoie QUE le nom d'affichage (aucune fuite d'email/rôles/statut). Best-effort : `name` à null si
// la session admin ou le lookup échoue — l'appelant retombe alors sur un repli (id tronqué).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    try {
      const adminSession = await getAdminSession();
      if (adminSession) {
        const users = await listTenantUsers(adminSession);
        const u = users.find((x) => x.userId === id);
        if (u) {
          const full = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
          return { name: full || u.username || null };
        }
      }
    } catch {
      /* résolution indisponible — repli côté appelant */
    }
    return { name: null };
  });
}
