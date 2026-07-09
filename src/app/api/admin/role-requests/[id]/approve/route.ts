import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import { promoteToEditorRoles } from '@/server/ksm/admin-session';
import * as editorApi from '@/server/ksm/modules/editor-applications';

// POST /api/admin/role-requests/{id}/approve — assigne les rôles Rédacteur (education + newsletter)
// puis marque la candidature APPROVED.
export async function POST(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
    if (!isPlatformAdmin(session.user.permissions ?? session.user.roles)) {
      return fail(403, 'FORBIDDEN', 'Admin only');
    }

    const { id } = await ctx.params;
    const all = await editorApi.listApplications(session);
    const app = all.find((a) => a.id === id);
    if (!app) return fail(404, 'NOT_FOUND', 'Candidature introuvable.');
    if (app.status !== 'PENDING') return fail(409, 'ALREADY_DECIDED', 'Candidature déjà traitée.');

    await promoteToEditorRoles(session, app.userId);

    return editorApi.setStatus(session, id, 'APPROVED');
  });
}
