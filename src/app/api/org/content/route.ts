import 'server-only';
import type { NextRequest } from 'next/server';
import { fail, ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { listOrgContent, type OrgContentType } from '@/server/ksm/modules/education';

const VALID_TYPES: OrgContentType[] = ['blog', 'course', 'podcast'];

/**
 * Liste le contenu (blog/course/podcast) de l'organisation active de la session — réutilise
 * `GET /api/v1/education/org/content` côté KSM, qui filtre déjà par organizationId résolu depuis
 * X-Organization-Id (envoyé automatiquement par callKsm depuis session.workspace.organizationId).
 * Sans organisation active, il n'y a rien à lister (contenu freelance = pas d'organizationId).
 */
export async function GET(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    if (!session.workspace?.organizationId) {
      return fail(400, 'NO_ORGANIZATION', 'Aucune organisation active sélectionnée.');
    }

    const typeParam = request.nextUrl.searchParams.get('type');
    if (!typeParam || !VALID_TYPES.includes(typeParam as OrgContentType)) {
      return fail(400, 'VALIDATION_ERROR', `type doit être l'un de : ${VALID_TYPES.join(', ')}`);
    }

    const items = await listOrgContent(session, typeParam as OrgContentType);
    return ok(items);
  });
}
