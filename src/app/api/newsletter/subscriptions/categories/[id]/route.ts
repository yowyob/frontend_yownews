import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// POST /api/newsletter/subscriptions/categories/{id} — { email } : s'abonner à une catégorie.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { email?: string };
    const email = String(body.email ?? '').trim();
    if (!email) return fail(400, 'VALIDATION_ERROR', 'email is required');
    await newsletterApi.subscribeCategory(session, session.user.id, id, email);
    return { ok: true };
  });
}

// DELETE /api/newsletter/subscriptions/categories/{id} — se désabonner d'une catégorie.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await newsletterApi.unsubscribeCategory(session, session.user.id, id);
    return { ok: true };
  });
}
