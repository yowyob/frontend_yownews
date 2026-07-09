import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

// Streame l'image de couverture depuis KSM (GET /api/v1/education/podcasts/{id}/coverpodcast).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return new Response(null, { status: 401 });

  const { id } = await params;
  const res = await educationApi.getContentCover(session, 'podcasts', id);
  if (!res.ok || !res.body) return new Response(null, { status: res.status === 200 ? 404 : res.status });

  return new Response(res.body, {
    status: 200,
    headers: { 'Content-Type': res.headers.get('content-type') ?? 'image/png' },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const { id } = await params;
    const incoming = await request.formData();
    const file = incoming.get('cover');
    if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', 'cover file is required');

    const forward = new FormData();
    forward.append('cover', file, file.name);
    return educationApi.uploadContentCover(session, 'podcasts', id, forward);
  });
}
