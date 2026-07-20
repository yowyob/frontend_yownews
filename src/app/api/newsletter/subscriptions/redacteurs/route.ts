import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import { getAdminSession } from '@/server/ksm/admin-session';
import { listTenantUsers } from '@/server/ksm/modules/administration';

export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const followed = await newsletterApi.listMyFollowedRedacteurs(session, session.user.id);

    // Enrichissement du vrai nom : certains rédacteurs ont prenom/nom dégradés (username/email) à
    // l'inscription. On croise par email avec l'annuaire admin (join actor_id → vrai firstName/
    // lastName), sans toucher au KSM. Best-effort : liste renvoyée telle quelle si indisponible.
    try {
      const adminSession = await getAdminSession();
      if (adminSession) {
        const users = await listTenantUsers(adminSession);
        const byEmail = new Map(users.map((u) => [u.email?.toLowerCase(), u]));
        return followed.map((r) => {
          const u = byEmail.get(r.email?.toLowerCase());
          if (u && (u.firstName || u.lastName)) {
            return { ...r, prenom: u.firstName ?? '', nom: u.lastName ?? '' };
          }
          return r;
        });
      }
    } catch {
      /* annuaire indisponible — repli sur la liste brute + anti-doublon côté affichage */
    }

    return followed;
  });
}
