import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { withAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees } from '@/server/ksm/modules/employees';

// Nom d'affichage d'un utilisateur, résolu via la logique employé (GET /api/employees de l'org
// plateforme, qui fait le bon join actorId → vrai firstName/lastName — contrairement au
// UserProfileService KSM qui joint par id de compte). Accessible à tout viewer authentifié : ne
// renvoie QUE le nom d'affichage (aucune fuite d'email/rôles/statut). Best-effort : `name` à null si
// la session admin, l'org ou le lookup échoue — l'appelant retombe alors sur un repli (id tronqué).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    try {
      const orgId = await resolvePlatformOrganizationId();
      if (orgId) {
        const result = await withAdminSession(async (admin) => ({
          employees: await listEmployees(admin, orgId),
          adminUser: admin.user,
        }));
        const e = result?.employees.find((x) => x.userId === id);
        if (e) {
          const full = [e.firstName, e.lastName].filter(Boolean).join(' ').trim();
          return { name: full || null };
        }
        // L'owner/admin Yowyob Education n'a aucune adhésion employé (créé par sign-up, rôle OWNER
        // scope TENANT — jamais invité) : absent de listEmployees par construction. On le reconnaît
        // via l'identité de la session admin elle-même (c'est ce même compte).
        if (result?.adminUser.id === id) {
          const full = [result.adminUser.firstName, result.adminUser.lastName].filter(Boolean).join(' ').trim();
          return { name: full || result.adminUser.username || null };
        }
      }
    } catch {
      /* résolution indisponible — repli côté appelant */
    }
    return { name: null };
  });
}
