import 'server-only';
import { handleRoute, ok } from '@/server/api-response';
import { destroySession } from '@/server/session';

export async function POST() {
  return handleRoute(async () => {
    await destroySession();
    return ok({ loggedOut: true });
  });
}
