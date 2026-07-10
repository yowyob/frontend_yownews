import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';
import { serverEnv } from '@/env';

const BASE = '/api/v1/education/publisher-orgs';

// État en mémoire (process du serveur dev) utilisé uniquement en MOCK_MODE, pour tester le
// cycle « demande de statut éditeur externe » et la gestion des membres sans backend KSM.
const MOCK_PUBLISHER_REQUESTS: PublisherOrgRequest[] = [];
const MOCK_EMPLOYEES: EmployeeMembership[] = [
  {
    id: 'mock-emp-1', tenantId: 'mock-tenant', organizationId: 'mock-org', userId: 'mock-user-emp-1',
    actorId: 'mock-user-id', email: 'sara.toure@example.com', agencyId: null, roleId: null,
    status: 'ACTIVE', createdAt: '2026-03-10T09:00:00.000Z',
  },
  {
    id: 'mock-emp-2', tenantId: 'mock-tenant', organizationId: 'mock-org', userId: 'mock-user-emp-2',
    actorId: 'mock-user-id', email: 'ibrahim.sow@example.com', agencyId: null, roleId: null,
    status: 'PENDING', createdAt: '2026-05-22T16:20:00.000Z',
  },
];

export type PublisherOrgRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type PublisherOrgRequest = {
  id: string;
  orgId: string;
  orgCode: string;
  displayName: string | null;
  requestedBy: string;
  status: PublisherOrgRequestStatus;
  tenantId: string;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
};

async function readRaw<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch {
      /* non-JSON body */
    }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

export async function requestPublisherStatus(
  session: AppSession,
  input: { orgId: string; orgCode: string; displayName: string },
) {
  if (serverEnv.MOCK_MODE) {
    const now = new Date().toISOString();
    const req: PublisherOrgRequest = {
      id: `mock-pub-req-${Date.now()}`,
      orgId: input.orgId,
      orgCode: input.orgCode,
      displayName: input.displayName || null,
      requestedBy: session.user.id,
      status: 'PENDING',
      tenantId: session.workspace?.tenantId ?? session.user.tenantId ?? 'mock-tenant',
      createdAt: now,
      decidedAt: null,
      decidedBy: null,
    };
    MOCK_PUBLISHER_REQUESTS.unshift(req);
    return req;
  }
  const res = await callKsm<Response>(BASE, { method: 'POST', body: input, raw: true }, { session });
  return readRaw<PublisherOrgRequest>(res);
}

export async function getMyRequest(session: AppSession): Promise<PublisherOrgRequest | null> {
  if (serverEnv.MOCK_MODE) {
    const mine = MOCK_PUBLISHER_REQUESTS.filter((r) => r.orgId === session.workspace?.organizationId);
    return mine[0] ?? null;
  }
  const res = await callKsm<Response>(`${BASE}/mine`, { method: 'GET', raw: true }, { session });
  if (res.status === 404) {
    return null;
  }
  return readRaw<PublisherOrgRequest>(res);
}

export async function listRequests(
  session: AppSession,
  status?: PublisherOrgRequestStatus,
): Promise<PublisherOrgRequest[]> {
  if (serverEnv.MOCK_MODE) {
    return status ? MOCK_PUBLISHER_REQUESTS.filter((r) => r.status === status) : MOCK_PUBLISHER_REQUESTS;
  }
  const path = status ? `${BASE}?status=${status}` : BASE;
  const res = await callKsm<Response>(path, { method: 'GET', raw: true }, { session });
  return (await readRaw<PublisherOrgRequest[]>(res)) ?? [];
}

export async function decideRequest(session: AppSession, id: string, status: PublisherOrgRequestStatus) {
  if (serverEnv.MOCK_MODE) {
    const req = MOCK_PUBLISHER_REQUESTS.find((r) => r.id === id);
    if (!req) throw new HttpError({ status: 404, errorCode: null, message: 'Demande introuvable' });
    req.status = status;
    req.decidedAt = new Date().toISOString();
    req.decidedBy = session.user.id;
    return req;
  }
  const res = await callKsm<Response>(
    `${BASE}/${id}/decide`,
    { method: 'PUT', body: { status }, raw: true },
    { session },
  );
  return readRaw<PublisherOrgRequest>(res);
}

export type EmployeeMembership = {
  id: string;
  tenantId: string;
  organizationId: string;
  userId: string;
  actorId: string;
  email: string;
  agencyId: string | null;
  roleId: string | null;
  status: string;
  createdAt: string;
};

export async function listEmployees(session: AppSession, orgId: string): Promise<EmployeeMembership[]> {
  if (serverEnv.MOCK_MODE) return MOCK_EMPLOYEES;
  const res = await callKsm<any>(`/api/employees?organizationId=${orgId}`, { method: 'GET' }, { session });
  // If api response is wrapped in ApiResponse success structure: { success: true, data: [...] }
  if (res && res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return Array.isArray(res) ? res : [];
}

export async function inviteEmployee(
  session: AppSession,
  orgId: string,
  email: string,
  permissions: string[],
): Promise<EmployeeMembership> {
  if (serverEnv.MOCK_MODE) {
    const emp: EmployeeMembership = {
      id: `mock-emp-${Date.now()}`, tenantId: session.workspace?.tenantId ?? 'mock-tenant', organizationId: orgId,
      userId: `mock-user-${Date.now()}`, actorId: session.user.id, email, agencyId: null, roleId: null,
      status: 'PENDING', createdAt: new Date().toISOString(),
    };
    MOCK_EMPLOYEES.unshift(emp);
    return emp;
  }
  const body = {
    email,
    permissions,
    roleId: null,
    agencyId: null,
  };
  const res = await callKsm<any>(`/api/employees/invite?organizationId=${orgId}`, {
    method: 'POST',
    body,
  }, { session });

  if (res && res.success && res.data) {
    return res.data;
  }
  return res;
}

export async function removeEmployee(session: AppSession, membershipId: string): Promise<void> {
  if (serverEnv.MOCK_MODE) {
    const idx = MOCK_EMPLOYEES.findIndex((e) => e.id === membershipId);
    if (idx >= 0) MOCK_EMPLOYEES.splice(idx, 1);
    return;
  }
  await callKsm<void>(`/api/employees/${membershipId}`, { method: 'DELETE' }, { session });
}

