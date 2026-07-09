import 'server-only';
import { type NextRequest } from 'next/server';
import { ok } from '@/server/api-response';
import { authenticatedRoute } from '@/server/handlers';
import { getMyRequest } from '@/server/ksm/modules/publisher-orgs';

export async function GET(request: NextRequest) {
  return authenticatedRoute(async (session) => {
    const req = await getMyRequest(session);
    return ok(req);
  });
}
