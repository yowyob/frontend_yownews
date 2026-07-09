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
    return educationApi.listCourseUnits(session, id);
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
    const body = (await request.json()) as Partial<educationApi.UnitCourseCreateInput>;
    const title = String(body.title ?? '').trim();
    const domain = String(body.domain ?? '').trim() || 'NONE';
    if (!title) return fail(400, 'VALIDATION_ERROR', 'title is required');

    return educationApi.createCourseUnit(session, id, {
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
