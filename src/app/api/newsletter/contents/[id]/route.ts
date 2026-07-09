import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// PUT /api/newsletter/contents/[id] — met à jour un contenu (titre / contenu).
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { titre?: string; contenu?: string };
    return newsletterApi.updateContent(session, id, session.user.id, body);
  });
}

// DELETE /api/newsletter/contents/[id] — suppression d'un contenu.
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await newsletterApi.deleteContent(session, id);
    return { ok: true };
  });
}
