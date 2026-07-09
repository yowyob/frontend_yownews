import 'server-only';
import { handleRoute } from '@/server/api-response';
import { readSession } from '@/server/session';
import type { AppSession } from '@/lib/types/auth';

export function authenticatedRoute<T>(
  handler: (session: AppSession) => Promise<T> | T,
): Promise<Response> {
  return handleRoute(async () => {
    const session = await readSession();
    if (!session) {
      return Response.json(
        { ok: false, status: 401, errorCode: 'UNAUTHORIZED', message: 'Not authenticated' },
        { status: 401 },
      );
    }
    return handler(session);
  });
}

export function requirePermissionRoute<T>(
  required: string | string[],
  handler: (session: AppSession) => Promise<T> | T,
): Promise<Response> {
  const list = Array.isArray(required) ? required : [required];
  return authenticatedRoute(async (session) => {
    const owned = new Set((session.user.permissions ?? []).map((p) => p.split('#')[0]!));
    if (!list.some((perm) => owned.has(perm))) {
      return Response.json(
        { ok: false, status: 403, errorCode: 'FORBIDDEN', message: `Missing one of: ${list.join(', ')}` },
        { status: 403 },
      );
    }
    return handler(session);
  });
}
