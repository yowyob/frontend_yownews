import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isEducationEditor, isPlatformAdmin } from '@/lib/roles';
import * as educationApi from '@/server/ksm/modules/education';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; unitId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const { id, unitId } = await params;
    const body = (await request.json()) as Partial<educationApi.UnitCourseCreateInput>;
    const title = String(body.title ?? '').trim();
    const domain = String(body.domain ?? '').trim() || 'NONE';
    if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');

    return educationApi.updateCourseUnit(session, id, unitId, {
      title,
      description: body.description,
      domain,
      unit: typeof body.unit === 'number' ? body.unit : undefined,
      freeTags: Array.isArray(body.freeTags) ? body.freeTags : [],
      freeCategories: Array.isArray(body.freeCategories) ? body.freeCategories : [],
      customDomain: typeof body.customDomain === 'string' ? body.customDomain : undefined,
    });
  });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; unitId: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');

    const authorities = session.user.permissions ?? session.user.roles;
    if (!isEducationEditor(authorities) && !isPlatformAdmin(authorities)) {
      return fail(403, 'FORBIDDEN', 'Réservé aux rédacteurs');
    }

    const { id, unitId } = await params;
    await educationApi.deleteCourseUnit(session, id, unitId);
    return { deleted: true };
  });
}
