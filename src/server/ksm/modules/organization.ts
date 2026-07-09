import 'server-only';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module organization renvoie l'enveloppe ApiResponse → callKsm (sans raw) déballe `.data`.

export type EmployeeMembershipResponse = {
  id: string;
  organizationId: string;
  userId: string;
  email: string;
  status: string;
  jobTitle: string | null;
  department: string | null;
  phoneNumber: string | null;
  employmentType: string | null;
  matricule: string | null;
  createdAt: string;
};

export type InviteEmployeeInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  employmentType?: string;
};

/**
 * Rattache un compte (déjà existant ou non) à une organisation KSM en tant que membre.
 * Si l'email correspond à un compte existant, KSM ne recrée rien : il ajoute juste
 * l'appartenance (EmployeeMembership). Lève une erreur si l'utilisateur est déjà membre
 * (DuplicateEmployeeMembershipException, 409) — à l'appelant de décider si c'est fail-open.
 */
export function inviteEmployee(session: AppSession, organizationId: string, input: InviteEmployeeInput) {
  return callKsm<EmployeeMembershipResponse>(
    `/api/employees/invite?organizationId=${organizationId}`,
    {
      method: 'POST',
      body: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        phoneNumber: input.phoneNumber,
        jobTitle: input.jobTitle,
        department: input.department,
        employmentType: input.employmentType,
        roleId: null,
        agencyId: null,
        permissions: [],
      },
      organizationId,
    },
    { session },
  );
}
