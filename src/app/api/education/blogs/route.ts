import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const status = request.nextUrl.searchParams.get('status') ?? undefined;
    return educationApi.listMyBlogs(session, status);
  });
}

export async function POST(request: NextRequest) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const body = (await request.json()) as Partial<educationApi.BlogCreateInput>;
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const content = String(body.content ?? '').trim();
    const domain = String(body.domain ?? '').trim() || 'NONE';
    const categories = Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories
      : ['NONE'];

    if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');
    if (!description) return fail(400, 'VALIDATION_ERROR', 'description is required');
    if (!content) return fail(400, 'VALIDATION_ERROR', 'content is required');

    return educationApi.createBlog(session, {
      title,
      description,
      domain,
      content,
      rawContent: body.rawContent,
      readingTime: typeof body.readingTime === 'number' && body.readingTime > 0 ? body.readingTime : 1,
      categories,
      tags: Array.isArray(body.tags) ? body.tags : [],
      freeTags: Array.isArray(body.freeTags) ? body.freeTags : [],
      freeCategories: Array.isArray(body.freeCategories) ? body.freeCategories : [],
      customDomain: typeof body.customDomain === 'string' ? body.customDomain : undefined,
    });
  });
}
