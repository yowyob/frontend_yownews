import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// POST/DELETE /api/newsletter/newsletters/[id]/subscribe — abonnement direct à UNE newsletter
// précise (ne couvre que celle-ci ; voir /api/newsletter/subscriptions/redacteurs pour suivre
// un rédacteur et couvrir automatiquement toutes ses newsletters, présentes et futures).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? session.user.email ?? '').trim();
    if (!email) return fail(400, 'VALIDATION_ERROR', 'email is required');
    await newsletterApi.subscribeToNewsletter(session, id, email);
    return { ok: true };
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await newsletterApi.unsubscribeFromNewsletter(session, id);
    return { ok: true };
  });
}
