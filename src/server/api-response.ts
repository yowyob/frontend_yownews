import 'server-only';
import { HttpError } from '@/lib/types/api';
import { logger } from '@/server/logger';

export type BffSuccess<T> = { ok: true; data: T };
export type BffError = { ok: false; status: number; errorCode: string | null; message: string; fields?: Record<string, string[]> };

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data } satisfies BffSuccess<T>, init);
}

export function fail(status: number, errorCode: string | null, message: string, fields?: Record<string, string[]>): Response {
  return Response.json({ ok: false, status, errorCode, message, fields } satisfies BffError, { status });
}

export async function handleRoute<T>(handler: () => Promise<T>): Promise<Response> {
  try {
    const result = await handler();
    if (result instanceof Response) return result;
    return ok(result);
  } catch (cause) {
    if (cause instanceof HttpError) {
      return fail(cause.status, cause.errorCode, cause.message, cause.validationErrors);
    }
    logger.error({ cause }, 'bff.unexpected_error');
    return fail(500, 'INTERNAL_ERROR', cause instanceof Error ? cause.message : 'Unexpected error');
  }
}
