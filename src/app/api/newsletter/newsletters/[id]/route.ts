import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/newsletters/[id] — détail d'une publication.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    return newsletterApi.getNewsletter(session, id);
  });
}

// PUT /api/newsletter/newsletters/[id] — le rédacteur modifie sa publication.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { titre?: string; description?: string; categorieIds?: string[] };
    return newsletterApi.updateNewsletter(session, id, session.user.id, body);
  });
}

// DELETE /api/newsletter/newsletters/[id] — suppression (admin).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await newsletterApi.deleteNewsletter(session, id);
    return { ok: true };
  });
}
