import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/subscriptions/newsletters — ids des newsletters auxquelles le lecteur
// connecté est directement abonné (abonnement précis, distinct du suivi d'un rédacteur).
export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    return newsletterApi.listMySubscribedNewsletterIds(session);
  });
}
