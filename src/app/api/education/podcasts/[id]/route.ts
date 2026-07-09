import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { getAdminSession } from '@/server/ksm/admin-session';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    let session = await readSession();
    if (!session) {
      session = await getAdminSession();
    }
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    const { id } = await params;
    return educationApi.getContent(session, 'podcasts', id);
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const { id } = await params;
    await educationApi.archiveContent(session, 'podcasts', id);
    return { archived: true };
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const { id } = await params;
    const body = (await request.json()) as Partial<educationApi.ContentCreateInput>;
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const domain = String(body.domain ?? '').trim() || 'NONE';
    const transcript = String(body.transcript ?? '').trim();
    const categories = Array.isArray(body.categories) && body.categories.length > 0 ? body.categories : ['NONE'];

    if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');
    if (!description) return fail(400, 'VALIDATION_ERROR', 'description is required');
    if (!transcript) return fail(400, 'VALIDATION_ERROR', 'transcript is required');

    return educationApi.updateContent(session, 'podcasts', id, {
      title,
      description,
      domain,
      transcript,
      categories,
      tags: Array.isArray(body.tags) && body.tags.length > 0 ? body.tags : ['NONE'],
      freeTags: Array.isArray(body.freeTags) ? body.freeTags : [],
      freeCategories: Array.isArray(body.freeCategories) ? body.freeCategories : [],
      customDomain: typeof body.customDomain === 'string' ? body.customDomain : undefined,
    });
  });
}
