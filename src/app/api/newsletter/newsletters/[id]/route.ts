import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';
import { isPlatformAdmin } from '@/lib/roles';

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

// DELETE /api/newsletter/newsletters/[id] — l'admin supprime n'importe quelle publication,
// le rédacteur supprime la sienne (propriété vérifiée côté backend dans les deux cas).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const authorities = session.user.permissions ?? session.user.roles;
    if (isPlatformAdmin(authorities)) {
      await newsletterApi.deleteNewsletterAsAdmin(session, id);
    } else {
      await newsletterApi.deleteOwnNewsletter(session, id);
    }
    return { ok: true };
  });
}
