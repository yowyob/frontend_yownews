import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getPublicProfile } from '@/server/ksm/modules/education';
import { getAdminSession } from '@/server/ksm/admin-session';
import { listTenantUsers } from '@/server/ksm/modules/administration';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    const profile = await getPublicProfile(session, id);

    // Le KSM (UserProfileService) interroge actor.actor par l'id de compte au lieu de actor_id et
    // retombe donc sur « Utilisateur YowNews » pour tout le monde. On récupère le vrai nom via la
    // liste admin (GET /api/administration/users), qui fait le bon join et est indexée par id de
    // compte — celui-là même qui sert d'authorId. Best-effort : on ne recopie QUE firstName/lastName
    // (aucune fuite d'email/rôles dans une réponse publique) et on tolère l'échec sans régression.
    try {
      const adminSession = await getAdminSession();
      if (adminSession) {
        const users = await listTenantUsers(adminSession);
        const match = users.find((u) => u.userId === id);
        if (match && (match.firstName || match.lastName)) {
          return { ...profile, firstName: match.firstName ?? '', lastName: match.lastName ?? '' };
        }
      }
    } catch {
      /* résolution du nom indisponible — on renvoie le profil tel quel */
    }

    return profile;
  });
}
