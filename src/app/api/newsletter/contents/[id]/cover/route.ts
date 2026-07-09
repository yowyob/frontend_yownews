import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

// Streame l'image de couverture d'un contenu depuis KSM (GET /api/v1/newsletter/contents/{id}/cover).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await readSession();
  if (!session) return new Response(null, { status: 401 });

  const { id } = await params;
  const res = await newsletterApi.getContentCover(session, id);
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

    const { id } = await params;
    const incoming = await request.formData();
    const file = incoming.get('cover');
    if (!(file instanceof File)) return fail(400, 'VALIDATION_ERROR', 'cover file is required');

    const forward = new FormData();
    forward.append('cover', file, file.name);
    return newsletterApi.uploadContentCover(session, id, forward);
  });
}
