import 'server-only';
import { serverEnv } from '@/env';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { withAdminSession } from '@/server/ksm/admin-session';
import { listNewslettersByStatus } from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/newsletters/by-author/{authorId} — l'auteur a-t-il au moins une newsletter
// (publication) APPROVED, et lesquelles (id + titre uniquement, pour permettre au profil public
// de proposer un abonnement par newsletter précise — voir onglet Newsletter du profil). Distinct
// du statut "rédacteur approuvé" (/api/newsletter/redacteurs/by-user) : un rédacteur peut être
// approuvé sans avoir encore créé/publié de newsletter. Lecture admin-mediated best-effort (même
// pattern que la résolution de nom d'auteur) ; ne renvoie ni description ni autres auteurs.
export async function GET(request: Request, { params }: { params: Promise<{ authorId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { authorId } = await params;

    // Démo sans backend réel : comportement inchangé, le bouton reste visible pour tout auteur
    // (même intention que le court-circuit MOCK_MODE de getApprovedRedacteurByUserId).
    if (serverEnv.MOCK_MODE) return { hasNewsletter: true, newsletters: [] as { id: string; titre: string }[] };

    try {
      const all = await withAdminSession((admin) => listNewslettersByStatus(admin, 'APPROVED'));
      const mine = (all ?? []).filter((n) => n.authorId === authorId);
      return {
        hasNewsletter: mine.length > 0,
        newsletters: mine.map((n) => ({ id: n.id, titre: n.titre })),
      };
    } catch {
      return { hasNewsletter: false, newsletters: [] as { id: string; titre: string }[] };
    }
  });
}
