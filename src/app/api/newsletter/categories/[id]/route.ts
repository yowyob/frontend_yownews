import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    const body = (await request.json()) as { nom?: string; description?: string };
    const nom = String(body.nom ?? '').trim();
    if (!nom) return fail(400, 'VALIDATION_ERROR', 'nom is required');
    return newsletterApi.updateCategory(session, id, { nom, description: body.description });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    await newsletterApi.deleteCategory(session, id);
    return null;
  });
}
