import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as educationApi from '@/server/ksm/modules/education';

export async function GET() {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    return educationApi.listCategories(session);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const body = (await request.json()) as { name?: string; description?: string; domain?: string };
    const name = String(body.name ?? '').trim();
    if (!name) return fail(400, 'VALIDATION_ERROR', 'name is required');

    return educationApi.createCategory(session, {
      name,
      description: body.description?.trim() || undefined,
      domain: body.domain?.trim() || 'EDUCATION',
    });
  });
}
