import 'server-only';
import type { NextRequest } from 'next/server';
import { handleRoute, fail } from '@/server/api-response';
import { readSession } from '@/server/session';
import { isPlatformAdmin } from '@/lib/roles';
import * as editorApi from '@/server/ksm/modules/editor-applications';

// POST /api/admin/role-requests/{id}/approve — enregistre l'autorisation (candidature APPROVED).
// L'admin ne peut PAS poser lui-même le rôle Rédacteur sur l'org freelance du candidat (il n'en est
// pas membre → 401 KSM). La matérialisation du rôle (EDUCATION_EDITOR + newsletter, scopés sur l'org
// du candidat) se fait à la CONNEXION SUIVANTE du rédacteur, via ensureServiceRolesSelf appelé depuis
// la route de login (niveau 'editor' déduit de ce statut APPROVED). Cf. docs/service-role-provisioning.md.
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

    return editorApi.setStatus(session, id, 'APPROVED');
  });
}
