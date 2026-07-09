import 'server-only';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// GET /api/newsletter/newsletters/[id]/contents — contenus d'une publication.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    return newsletterApi.listContents(session, id);
  });
}

// POST /api/newsletter/newsletters/[id]/contents — { titre, contenu? }
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { titre?: string; contenu?: string };
    const titre = String(body.titre ?? '').trim();
    if (!titre) return fail(400, 'VALIDATION_ERROR', 'titre is required');
    return newsletterApi.createContent(session, id, session.user.id, { titre, contenu: body.contenu ?? '' });
  });
}
