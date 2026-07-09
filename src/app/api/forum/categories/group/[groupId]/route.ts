import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import * as forumApi from '@/server/ksm/modules/forum';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { groupId } = await params;
    return forumApi.listCategoriesByGroup(session, groupId);
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { groupId } = await params;
    const body = (await request.json()) as { categorieName?: string };
    const categorieName = String(body.categorieName ?? '').trim();
    if (!categorieName) return fail(400, 'VALIDATION_ERROR', 'categorieName is required');
    return forumApi.createCategorie(session, groupId, { categorieName });
  });
}
