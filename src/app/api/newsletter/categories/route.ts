import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as newsletterApi from '@/server/ksm/modules/newsletter';

export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    return newsletterApi.listCategories(session);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const body = (await request.json()) as { nom?: string; description?: string };
    const nom = String(body.nom ?? '').trim();
    if (!nom) return fail(400, 'VALIDATION_ERROR', 'nom is required');
    return newsletterApi.createCategory(session, { nom, description: body.description });
  });
}
