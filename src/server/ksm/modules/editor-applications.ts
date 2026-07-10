import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';
import { serverEnv } from '@/env';

// Candidatures « Devenir Rédacteur » — table editor_application du module education.
// Education renvoie des entités BRUTES (pas d'enveloppe) → callKsm en `raw` + parsing maison.

const BASE = '/api/v1/education/editor-applications';

// Store en mémoire (process du serveur dev) utilisé uniquement en MOCK_MODE, pour pouvoir
// tester le cycle complet « candidature → décision admin » sans backend KSM.
const MOCK_APPLICATIONS: EditorApplication[] = [];

export type EditorApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type EditorApplication = {
  id: string;
  userId: string;
  applicantEmail: string | null;
  applicantName: string | null;
  domains: string[];
  proofUrl: string | null;
  motivation: string | null;
  status: EditorApplicationStatus;
  tenantId: string | null;
  organizationId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
};

export type SubmitApplicationInput = {
  domains: string[];
  proofUrl: string;
  motivation: string;
};

async function readRaw<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch {
      /* corps non-JSON */
    }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
  return text ? (JSON.parse(text) as T) : (null as T);
}

/** Le candidat soumet sa demande (le BFF ajoute email/nom depuis la session). */
export async function submitApplication(session: AppSession, input: SubmitApplicationInput) {
  const body = {
    domains: input.domains,
    proofUrl: input.proofUrl,
    motivation: input.motivation,
    applicantEmail: session.user.email,
    applicantName:
      [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email,
  };
  if (serverEnv.MOCK_MODE) {
    const now = new Date().toISOString();
    const app: EditorApplication = {
      id: `mock-app-${Date.now()}`,
      userId: session.user.id,
      applicantEmail: body.applicantEmail,
      applicantName: body.applicantName,
      domains: body.domains,
      proofUrl: body.proofUrl,
      motivation: body.motivation,
      status: 'PENDING',
      tenantId: session.workspace?.tenantId ?? session.user.tenantId ?? null,
      organizationId: session.workspace?.organizationId ?? null,
      createdAt: now,
      updatedAt: now,
      decidedAt: null,
      decidedBy: null,
    };
    MOCK_APPLICATIONS.unshift(app);
    return app;
  }
  const res = await callKsm<Response>(BASE, { method: 'POST', body, raw: true }, { session });
  return readRaw<EditorApplication>(res);
}

/** Candidatures de l'utilisateur courant (la plus récente en premier). */
export async function getMyApplication(session: AppSession): Promise<EditorApplication | null> {
  if (serverEnv.MOCK_MODE) {
    const mine = MOCK_APPLICATIONS.filter((a) => a.userId === session.user.id);
    if (!mine.length) return null;
    return [...mine].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]!;
  }
  const res = await callKsm<Response>(`${BASE}/me`, { method: 'GET', raw: true }, { session });
  const list = (await readRaw<EditorApplication[]>(res)) ?? [];
  if (!list.length) return null;
  return [...list].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0]!;
}

/** Liste des candidatures (admin), filtrée par statut. */
export async function listApplications(
  session: AppSession,
  status?: EditorApplicationStatus,
): Promise<EditorApplication[]> {
  if (serverEnv.MOCK_MODE) {
    return status ? MOCK_APPLICATIONS.filter((a) => a.status === status) : MOCK_APPLICATIONS;
  }
  const path = status ? `${BASE}?status=${status}` : BASE;
  const res = await callKsm<Response>(path, { method: 'GET', raw: true }, { session });
  return (await readRaw<EditorApplication[]>(res)) ?? [];
}

/** Change le statut d'une candidature (admin). */
export async function setStatus(session: AppSession, id: string, status: EditorApplicationStatus) {
  if (serverEnv.MOCK_MODE) {
    const app = MOCK_APPLICATIONS.find((a) => a.id === id);
    if (!app) throw new HttpError({ status: 404, errorCode: null, message: 'Application introuvable' });
    app.status = status;
    app.decidedAt = new Date().toISOString();
    app.decidedBy = session.user.id;
    return app;
  }
  const res = await callKsm<Response>(
    `${BASE}/${id}/status`,
    { method: 'PATCH', body: { status }, raw: true },
    { session },
  );
  return readRaw<EditorApplication>(res);
}
