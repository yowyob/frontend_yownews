import 'server-only';
import { authenticatedRoute } from '@/server/handlers';
import { getMyApplication } from '@/server/ksm/modules/editor-applications';

// GET /api/role-requests/me — candidature courante de l'utilisateur connecté (ou null).
export async function GET() {
  return authenticatedRoute(async (session) => {
    return getMyApplication(session);
  });
}
