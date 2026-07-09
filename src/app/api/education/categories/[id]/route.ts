import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail, ok } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as educationApi from '@/server/ksm/modules/education';

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, ctx: Ctx) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await ctx.params;
    const body = (await request.json()) as { name?: string; description?: string; domain?: string };
    const name = String(body.name ?? '').trim();
    if (!name) return fail(400, 'VALIDATION_ERROR', 'name is required');

    return educationApi.updateCategory(session, id, {
      name,
      description: body.description?.trim() || undefined,
      domain: body.domain?.trim() || 'EDUCATION',
    });
  });
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const { id } = await ctx.params;
    await educationApi.deleteCategory(session, id);
    return ok({ id });
  });
}
