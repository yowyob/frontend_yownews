export type BffSuccess<T> = { ok: true; data: T };
export type BffError = { ok: false; status: number; errorCode: string | null; message: string; fields?: Record<string, string[]> };

export class BffApiError extends Error {
  status: number;
  errorCode: string | null;
  fields?: Record<string, string[]>;

  constructor(error: BffError) {
    super(error.message);
    this.name = 'BffApiError';
    this.status = error.status;
    this.errorCode = error.errorCode;
    this.fields = error.fields;
  }
}

type ClientRequestInit = Omit<RequestInit, 'body'> & { body?: unknown; json?: boolean };

export async function apiFetch<T>(path: string, init: ClientRequestInit = {}): Promise<T> {
  const { body, json = true, headers, ...rest } = init;
  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...((headers ?? {}) as Record<string, string>),
  };
  if (json && body !== undefined) finalHeaders['Content-Type'] = 'application/json';

  if (typeof window !== 'undefined') {
    let guestId = localStorage.getItem('yownews_guest_id');
    if (!guestId) {
      guestId = crypto.randomUUID();
      localStorage.setItem('yownews_guest_id', guestId);
    }
    finalHeaders['x-guest-id'] = guestId;
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : typeof body === 'string' || body instanceof FormData
          ? (body as BodyInit)
          : JSON.stringify(body),
  });

  const text = await response.text();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let payload: any = null;
  if (text) {
    try { payload = JSON.parse(text); } catch {}
  }

  if (!response.ok || (payload && payload.ok === false)) {
    // Session expirée (token KSM périmé côté BFF → 401 UNAUTHORIZED) : au lieu de laisser
    // remonter une erreur brute dans l'UI, on renvoie l'utilisateur se ré-authentifier.
    const isAuthError = response.status === 401 || (payload && payload.errorCode === 'UNAUTHORIZED');
    const isProtectedRoute = typeof window !== 'undefined' && (
      window.location.pathname.includes('/reader') ||
      window.location.pathname.includes('/editor') ||
      window.location.pathname.includes('/admin')
    );
    if (isAuthError && isProtectedRoute) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/auth/login?next=${next}`);
    }
    if (payload && payload.ok === false) throw new BffApiError(payload as BffError);
    throw new BffApiError({ ok: false, status: response.status, errorCode: null, message: response.statusText || 'Request failed' });
  }

  return payload && payload.ok === true ? payload.data : payload;
}
