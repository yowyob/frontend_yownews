import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module employees renvoie l'enveloppe ApiResponse → callKsm (sans raw) déballe `.data`.

export type EmployeeMembershipResponse = {
  id: string;
  organizationId: string;
  userId: string;
  actorId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  agencyId?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  status: string;
  jobTitle?: string | null;
  department?: string | null;
  phoneNumber?: string | null;
  employmentType?: string | null;
  matricule?: string | null;
  joinedAt?: string | null;
};

export function listEmployees(session: AppSession, organizationId: string) {
  return callKsm<EmployeeMembershipResponse[]>(
    `/api/employees?organizationId=${organizationId}`,
    { method: 'GET', organizationId },
    { session },
  );
}

export type InviteEmployeeInput = {
  firstName?: string;
  lastName?: string;
  email: string;
  roleId?: string | null;
  permissions?: string[];
  jobTitle?: string;
  department?: string;
  phoneNumber?: string;
};

/** Invite un employé (compte KSM déjà existant) dans l'organisation — pas de création de
 *  compte, seulement une affectation de rôle. Nécessite le service HRM souscrit à l'org. */
export function inviteEmployee(session: AppSession, organizationId: string, input: InviteEmployeeInput) {
  return callKsm<EmployeeMembershipResponse>(
    `/api/employees/invite?organizationId=${organizationId}`,
    {
      method: 'POST',
      body: {
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        email: input.email,
        password: null,
        roleId: input.roleId ?? null,
        agencyId: null,
        permissions: input.permissions ?? [],
        jobTitle: input.jobTitle ?? null,
        department: input.department ?? null,
        phoneNumber: input.phoneNumber ?? null,
        employmentType: null,
        photoUri: null,
        photoId: null,
      },
      organizationId,
    },
    { session },
  );
}

/** Retire un employé de l'organisation. */
export function removeEmployee(session: AppSession, organizationId: string, membershipId: string) {
  return callKsm<void>(
    `/api/employees/${membershipId}`,
    { method: 'DELETE', organizationId },
    { session },
  );
}

/**
 * Modifie le rôle d'un employé déjà membre de l'organisation (PUT /api/employees/{id}).
 * Les champs non fournis (null) sont conservés tels quels côté KSM (patch partiel) —
 * on n'envoie donc que roleId, sans risque d'écraser jobTitle/department/phoneNumber.
 */
export function updateEmployeeRole(
  session: AppSession,
  organizationId: string,
  membershipId: string,
  roleId: string | null,
) {
  return callKsm<EmployeeMembershipResponse>(
    `/api/employees/${membershipId}`,
    {
      method: 'PUT',
      body: {
        roleId,
        agencyId: null,
        firstName: null,
        lastName: null,
        jobTitle: null,
        department: null,
        phoneNumber: null,
        employmentType: null,
        photoUri: null,
        photoId: null,
      },
      organizationId,
    },
    { session },
  );
}
