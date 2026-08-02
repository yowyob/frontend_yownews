import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getPublicProfile } from '@/server/ksm/modules/education';
import { withAdminSession } from '@/server/ksm/admin-session';
import { resolvePlatformOrganizationId } from '@/server/ksm/platform-org';
import { listEmployees } from '@/server/ksm/modules/employees';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await params;
    const profile = await getPublicProfile(session, id);

    // Le KSM (UserProfileService) interroge actor.actor par l'id de compte au lieu de actor_id et
    // retombe donc sur « Utilisateur YowNews » pour tout le monde. On récupère le vrai nom (et, si
    // absente du profil, la photo) via la logique employé (GET /api/employees de l'org plateforme),
    // qui fait le bon join actorId et est indexée par id de compte — celui-là même qui sert
    // d'authorId. Best-effort : on ne recopie QUE firstName/lastName/photoId (aucune fuite
    // d'email/rôles dans une réponse publique) et on tolère l'échec sans régression.
    try {
      const orgId = await resolvePlatformOrganizationId();
      if (orgId) {
        const result = await withAdminSession(async (admin) => ({
          employees: await listEmployees(admin, orgId),
          adminUser: admin.user,
        }));
        const match = result?.employees.find((e) => e.userId === id);
        if (match && (match.firstName || match.lastName || match.photoId)) {
          return {
            ...profile,
            firstName: match.firstName ?? profile.firstName ?? '',
            lastName: match.lastName ?? profile.lastName ?? '',
            photoId: match.photoId ?? profile.photoId ?? null,
          };
        }
        // L'owner/admin Yowyob Education n'a aucune adhésion employé (créé par sign-up, rôle OWNER
        // scope TENANT — jamais invité) : absent de listEmployees par construction. On le reconnaît
        // via l'identité de la session admin elle-même (c'est ce même compte). Pas de photoId à ce
        // niveau (la session admin n'en porte pas) : celui du profil KSM reste utilisé tel quel.
        if (result?.adminUser.id === id) {
          const { firstName, lastName, username } = result.adminUser;
          const full = [firstName, lastName].filter(Boolean).join(' ').trim();
          // Le compte admin/owner n'a souvent aucun firstName/lastName renseigné (juste un
          // username) : repli sur celui-ci plutôt que de laisser retomber sur « Utilisateur ».
          if (full || username) {
            return {
              ...profile,
              firstName: full ? (firstName ?? profile.firstName ?? '') : (username ?? profile.firstName ?? ''),
              lastName: full ? (lastName ?? profile.lastName ?? '') : '',
            };
          }
        }
      }
    } catch {
      /* résolution indisponible — on renvoie le profil tel quel */
    }

    return profile;
  });
}
