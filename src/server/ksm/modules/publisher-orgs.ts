import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

const BASE = '/api/v1/education/publisher-orgs';

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
  const res = await callKsm<Response>(BASE, { method: 'POST', body: input, raw: true }, { session });
  return readRaw<PublisherOrgRequest>(res);
}

export async function getMyRequest(session: AppSession): Promise<PublisherOrgRequest | null> {
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
  const path = status ? `${BASE}?status=${status}` : BASE;
  const res = await callKsm<Response>(path, { method: 'GET', raw: true }, { session });
  return (await readRaw<PublisherOrgRequest[]>(res)) ?? [];
}

export async function decideRequest(session: AppSession, id: string, status: PublisherOrgRequestStatus) {
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
  await callKsm<void>(`/api/employees/${membershipId}`, { method: 'DELETE' }, { session });
}

