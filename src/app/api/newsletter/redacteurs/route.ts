import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// POST /api/newsletter/redacteurs — demande de création de newsletter.
// nom/prénom proviennent du compte authentifié ; email est saisi explicitement (peut différer).
export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? '').trim();
    if (!email) return fail(400, 'VALIDATION_ERROR', 'email is required');

    const nom = session.user.lastName || session.user.email;
    const prenom = session.user.firstName || session.user.username || '-';

    return newsletterApi.createRedacteurRequest(session, session.user.id, { nom, prenom, email });
  });
}
