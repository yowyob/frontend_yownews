import 'server-only';
import { logger } from '@/server/logger';
import { HttpError, type ApiResponse } from '@/lib/types/api';

export async function unwrapKsm<T>(res: Response, requestId?: string): Promise<T> {
  const text = await res.text();
  let envelope: ApiResponse<T> | null = null;
  if (text) {
    try { envelope = JSON.parse(text) as ApiResponse<T>; } catch {}
  }

  if (!res.ok) {
    if (!envelope) {
      logger.error({ requestId, status: res.status, body: text }, 'ksm.call_failed_raw_body');
    }
    throw new HttpError({
      status: res.status,
      errorCode: envelope?.errorCode ?? null,
      message: envelope?.message ?? res.statusText ?? 'Request failed',
      requestId,
    });
  }

  if (!envelope) {
    throw new HttpError({
      status: 500,
      errorCode: 'INVALID_RESPONSE',
      message: 'Backend returned empty or non-JSON response',
      requestId,
    });
  }

  if (!envelope.success) {
    throw new HttpError({
      status: res.status,
      errorCode: envelope.errorCode ?? null,
      message: envelope.message ?? 'Request failed',
      requestId,
    });
  }

  return envelope.data as T;
}
