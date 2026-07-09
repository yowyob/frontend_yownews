import { readSession } from '@/server/session';
import { ok, fail } from '@/server/api-response';

export async function GET() {
  const session = await readSession();
  if (!session) return fail(401, 'UNAUTHORIZED', 'Not authenticated');
  return ok({
    user: session.user,
    workspace: session.workspace,
    expiresAt: session.expiresAt,
    forcePasswordChange: session.forcePasswordChange ?? false,
  });
}
