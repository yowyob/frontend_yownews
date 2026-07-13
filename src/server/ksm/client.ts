import 'server-only';
import { serverEnv } from '@/env';
import type { AppSession } from '@/lib/types/auth';
import { logger } from '@/server/logger';
import { unwrapKsm } from './errors';
import { resolvePlatformOrganizationId } from './platform-org';

type CallOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  authenticated?: boolean;
  organizationId?: string | null;
  agencyId?: string | null;
  headers?: Record<string, string>;
  raw?: boolean;
  signal?: AbortSignal;
};

type CallContext = { session?: AppSession | null };

export async function callKsm<T>(
  path: string,
  options: CallOptions = {},
  ctx: CallContext = {},
): Promise<T> {
  const requestId = crypto.randomUUID();
  const url = `${serverEnv.KSM_BASE_URL}${path}`;
  const method = options.method ?? 'GET';
  // Pour un upload multipart on laisse fetch poser le Content-Type (+ boundary).
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    'X-Client-Id': serverEnv.KSM_CLIENT_ID,
    'X-Api-Key': serverEnv.KSM_API_KEY,
    'X-Request-Id': requestId,
    ...(options.headers ?? {}),
  };

  const authenticated = options.authenticated ?? true;
  const session = ctx.session ?? null;
  if (authenticated && session) {
    headers.Authorization = `Bearer ${session.accessToken}`;

    const tenantId = session.workspace?.tenantId ?? session.user.tenantId;
    if (tenantId) headers['X-Tenant-Id'] = tenantId;

    // Identité de l'utilisateur pour les endpoints qui personnalisent par user
    // (ex. fil d'actualité education : abonnements ; cf. AbonnementController).
    if (session.user.id) headers['X-User-Id'] = session.user.id;

    // Org context for the kernel gate: explicit override > validated session org
    // > platform org resolved from KSM by code (authoritative on KSM, no UUID here).
    // `organizationId: null` (as opposed to simply omitted) is an explicit "no org
    // context" — needed for endpoints like /api/organizations/my whose session may
    // belong to a tenant/actor entirely unrelated to the platform org (ex. login
    // mode organisation) : falling back to the platform org id there would send a
    // mismatched X-Organization-Id and break the kernel gate.
    let orgId = options.organizationId;
    if (orgId === undefined) {
      orgId = session.workspace?.organizationId ?? null;
      if (!orgId) orgId = await resolvePlatformOrganizationId();
    }
    if (orgId) headers['X-Organization-Id'] = orgId;

    const agId = options.agencyId ?? session.workspace?.agencyId;
    if (agId) headers['X-Agency-Id'] = agId;
  }

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    signal: options.signal,
  };
  if (options.body !== undefined) {
    init.body = isFormData || typeof options.body === 'string'
      ? (options.body as BodyInit)
      : JSON.stringify(options.body);
  }

  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (cause) {
    logger.error({ requestId, path, method, cause }, 'ksm.fetch_failed');
    throw cause;
  }
  const durationMs = Date.now() - started;
  logger.debug({ requestId, path, method, status: res.status, durationMs }, 'ksm.call');

  if (options.raw) return res as unknown as T;
  return unwrapKsm<T>(res, requestId);
}
