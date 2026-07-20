import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';
import { serverEnv } from '@/env';

// Le module newsletter renvoie des entités BRUTES (pas d'enveloppe ApiResponse),
// donc on appelle callKsm en `raw` puis on parse/valide la réponse nous-mêmes.

export type RedacteurStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';
// Statut d'une PUBLICATION (newsletter_entity) : gate admin qui révèle la rédaction.
export type NewsletterStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
// Statut d'un CONTENU (newsletter_content_entity) : cycle de rédaction/modération.
export type StatutNewsletter = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';

export type CategorieEntity = { id: string; nom: string; description?: string | null };

export type RedacteurRequestEntity = {
  id: string;
  userId: string;
  email: string;
  nom: string;
  prenom: string;
  status: RedacteurStatus;
  createdAt?: string | null;
  processedAt?: string | null;
  rejectionReason?: string | null;
};

// Une PUBLICATION newsletter (canal) : titre + description + catégories, validée par l'admin.
export type NewsletterEntity = {
  id: string;
  titre: string;
  description?: string | null;
  authorId: string;
  statut: NewsletterStatus;
  coverId?: string | null;
  categories?: CategorieEntity[] | null;
  createdAt?: string | null;
};

// Un CONTENU rattaché à une publication.
export type NewsletterContentEntity = {
  id: string;
  newsletterId: string;
  newsletterTitre?: string | null;
  titre: string;
  contenu: string;
  statut: StatutNewsletter;
  coverId?: string | null;
  authorId: string;
  categories?: CategorieEntity[] | null;
  createdAt?: string | null;
  publishedAt?: string | null;
};

async function readRaw<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch {
      /* corps non-JSON : on garde le statusText */
    }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
  return (text ? (JSON.parse(text) as T) : (null as T));
}

// ── Média inséré dans le corps d'un contenu (éditeur par blocs) ──
// Image en ligne ou fichier joint, hébergés côté KSM. Renvoie une URL publique ABSOLUE (l'email
// n'a pas d'URL de base), écrite telle quelle dans le HTML `contenu`.
export type NewsletterMediaUpload = { id: string; url: string };

export async function uploadNewsletterMedia(session: AppSession, formData: FormData) {
  const res = await callKsm<Response>(
    '/api/v1/newsletter/media',
    { method: 'POST', body: formData, raw: true },
    { session },
  );
  return readRaw<NewsletterMediaUpload>(res);
}

// ── Catégories ──
export async function listCategories(session: AppSession) {
  const res = await callKsm<Response>('/api/v1/newsletter/categorie', { method: 'GET', raw: true }, { session });
  return readRaw<CategorieEntity[]>(res);
}

export async function createCategory(session: AppSession, body: { nom: string; description?: string }) {
  const res = await callKsm<Response>('/api/v1/newsletter/categorie', { method: 'POST', body, raw: true }, { session });
  return readRaw<CategorieEntity>(res);
}

export async function updateCategory(session: AppSession, id: string, body: { nom: string; description?: string }) {
  const res = await callKsm<Response>(`/api/v1/newsletter/categorie/${id}`, { method: 'PUT', body, raw: true }, { session });
  return readRaw<CategorieEntity>(res);
}

export async function deleteCategory(session: AppSession, id: string) {
  await callKsm<Response>(`/api/v1/newsletter/categorie/${id}`, { method: 'DELETE', raw: true }, { session });
}

// ── Demande de création de newsletter (= demande rédacteur) ──
export async function createRedacteurRequest(session: AppSession, userId: string, body: {
  nom: string; prenom: string; email: string;
}) {
  const res = await callKsm<Response>(
    `/api/v1/newsletter/redacteurs?userId=${userId}`,
    { method: 'POST', body, raw: true },
    { session },
  );
  return readRaw<RedacteurRequestEntity>(res);
}

export async function getMyRedacteurRequest(session: AppSession, userId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/redacteurs/me?userId=${userId}`, { method: 'GET', raw: true }, { session });
  if (res.status === 404) return null;
  return readRaw<RedacteurRequestEntity>(res);
}

export type ApprovedRedacteurEntity = { id: string; email: string; nom: string; prenom: string } | null;

// Renvoie le rédacteur APPROVED pour ce compte, ou un objet vide-ish (id null) si aucun —
// le endpoint KSM répond 200 avec un corps vide plutôt que 404 pour ce cas (Mono vide).
export async function getApprovedRedacteurByUserId(session: AppSession, userId: string) {
  // Générique en mode démo : n'importe quel auteur de contenu est traité comme rédacteur
  // newsletter approuvé, pour que le bouton "S'abonner" soit visible sans donnée réelle.
  if (serverEnv.MOCK_MODE) {
    return { id: `mock-redacteur-${userId}`, email: 'demo@yowyob-edu.com', nom: 'YowYob', prenom: 'Auteur' } satisfies ApprovedRedacteurEntity;
  }
  const res = await callKsm<Response>(`/api/v1/newsletter/redacteurs/by-user/${userId}`, { method: 'GET', raw: true }, { session });
  if (res.status === 404 || res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text) as ApprovedRedacteurEntity;
}

// ── Modération admin des demandes rédacteur ──
export async function listPendingRedacteurRequests(session: AppSession) {
  const res = await callKsm<Response>('/api/v1/newsletter/admin/redacteurs/pending', { method: 'GET', raw: true }, { session });
  return readRaw<RedacteurRequestEntity[]>(res);
}

export async function listRedacteurRequestsByStatus(session: AppSession, status?: string) {
  const qs = status ? `?status=${status}` : '';
  const res = await callKsm<Response>(`/api/v1/newsletter/admin/redacteurs/requests${qs}`, { method: 'GET', raw: true }, { session });
  return readRaw<RedacteurRequestEntity[]>(res);
}

export async function approveRedacteurRequest(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/newsletter/admin/redacteurs/requests/${id}/approve`,
    { method: 'POST', body: {}, raw: true },
    { session },
  );
  return readRaw<RedacteurRequestEntity>(res);
}

export async function rejectRedacteurRequest(session: AppSession, id: string, reason: string) {
  const res = await callKsm<Response>(
    `/api/v1/newsletter/admin/redacteurs/requests/${id}/reject`,
    { method: 'POST', body: { reason }, raw: true },
    { session },
  );
  return readRaw<RedacteurRequestEntity>(res);
}

// Révoque un rédacteur précédemment APPROVED (transition de statut métier — distinct du rejet,
// qui s'applique à une demande jamais approuvée). La route BFF appelante retire en plus le rôle
// RBAC NEWSLETTER_EDITOR via administration.revokeRole — les deux actions sont complémentaires,
// pas redondantes (cf. Bug 4).
export async function revokeRedacteurRequest(session: AppSession, id: string) {
  const res = await callKsm<Response>(
    `/api/v1/newsletter/admin/redacteurs/requests/${id}/revoke`,
    { method: 'POST', body: {}, raw: true },
    { session },
  );
  return readRaw<RedacteurRequestEntity>(res);
}

// ── Publications newsletter (canal) ──
// Le rédacteur approuvé crée d'abord une PUBLICATION (titre + description + catégories),
// que l'admin valide, ce qui révèle ensuite l'espace de rédaction de contenus.
export async function createNewsletter(session: AppSession, userId: string, body: { titre: string; description?: string; authorNom?: string; authorPrenom?: string; categorieIds: string[] }) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters?userId=${userId}`, { method: 'POST', body, raw: true }, { session });
  return readRaw<NewsletterEntity>(res);
}

export async function updateNewsletter(session: AppSession, id: string, userId: string, body: { titre?: string; description?: string; categorieIds?: string[] }) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters/${id}?userId=${userId}`, { method: 'PUT', body, raw: true }, { session });
  return readRaw<NewsletterEntity>(res);
}

export async function listMyNewsletters(session: AppSession, userId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters/mine?userId=${userId}`, { method: 'GET', raw: true }, { session });
  return readRaw<NewsletterEntity[]>(res);
}

export async function getNewsletter(session: AppSession, id: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters/${id}`, { method: 'GET', raw: true }, { session });
  return readRaw<NewsletterEntity>(res);
}

// ── Modération admin des publications ──
export async function listNewslettersByStatus(session: AppSession, status?: NewsletterStatus) {
  const qs = status ? `?status=${status}` : '';
  const res = await callKsm<Response>(`/api/v1/newsletter/admin/newsletters${qs}`, { method: 'GET', raw: true }, { session });
  return readRaw<NewsletterEntity[]>(res);
}

export async function approveNewsletter(session: AppSession, id: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/admin/newsletters/${id}/approve`, { method: 'POST', raw: true }, { session });
  return readRaw<NewsletterEntity>(res);
}

export async function rejectNewsletter(session: AppSession, id: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/admin/newsletters/${id}/reject`, { method: 'POST', raw: true }, { session });
  return readRaw<NewsletterEntity>(res);
}

export async function deleteNewsletter(session: AppSession, id: string) {
  await callKsm<Response>(`/api/v1/newsletter/admin/newsletters/${id}`, { method: 'DELETE', raw: true }, { session });
}

// ── Contenus d'une publication (rédaction) ──
export async function createContent(session: AppSession, newsletterId: string, userId: string, body: { titre: string; contenu?: string }) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters/${newsletterId}/contents?userId=${userId}`, { method: 'POST', body, raw: true }, { session });
  return readRaw<NewsletterContentEntity>(res);
}

export async function listContents(session: AppSession, newsletterId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/newsletters/${newsletterId}/contents`, { method: 'GET', raw: true }, { session });
  return readRaw<NewsletterContentEntity[]>(res);
}

export async function updateContent(session: AppSession, id: string, userId: string, body: { titre?: string; contenu?: string }) {
  const res = await callKsm<Response>(`/api/v1/newsletter/contents/${id}?userId=${userId}`, { method: 'PUT', body, raw: true }, { session });
  return readRaw<NewsletterContentEntity>(res);
}

export async function submitContent(session: AppSession, id: string, userId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/contents/${id}/submit?userId=${userId}`, { method: 'POST', raw: true }, { session });
  return readRaw<NewsletterContentEntity>(res);
}

export async function listContentsByStatut(session: AppSession, statut: StatutNewsletter) {
  const res = await callKsm<Response>(`/api/v1/newsletter/contents?statut=${statut}`, { method: 'GET', raw: true }, { session });
  return readRaw<NewsletterContentEntity[]>(res);
}

export async function publishContent(session: AppSession, id: string, userId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/contents/${id}/publish?userId=${userId}`, { method: 'POST', raw: true }, { session });
  return readRaw<NewsletterContentEntity>(res);
}

export async function deleteContent(session: AppSession, id: string) {
  await callKsm<Response>(`/api/v1/newsletter/contents/${id}`, { method: 'DELETE', raw: true }, { session });
}

export async function uploadContentCover(session: AppSession, id: string, formData: FormData) {
  const res = await callKsm<Response>(
    `/api/v1/newsletter/contents/${id}/cover`,
    { method: 'POST', body: formData, raw: true },
    { session },
  );
  return readRaw<NewsletterContentEntity>(res);
}

// Renvoie la réponse brute (flux binaire) de la cover d'un contenu, pour streaming direct côté route BFF.
export function getContentCover(session: AppSession, id: string) {
  return callKsm<Response>(
    `/api/v1/newsletter/contents/${id}/cover`,
    { method: 'GET', raw: true },
    { session },
  );
}

// ── Abonnements lecteur (catégories) ──
export async function subscribeCategory(session: AppSession, userId: string, categorieId: string, email: string) {
  await callKsm<Response>(
    `/api/v1/newsletter/abonnements/categories/${categorieId}?userId=${userId}`,
    { method: 'POST', body: { email }, raw: true },
    { session },
  );
}

export async function unsubscribeCategory(session: AppSession, userId: string, categorieId: string) {
  await callKsm<Response>(`/api/v1/newsletter/abonnements/categories/${categorieId}?userId=${userId}`, { method: 'DELETE', raw: true }, { session });
}

export async function listMyCategorySubscriptions(session: AppSession, userId: string) {
  const res = await callKsm<Response>(`/api/v1/newsletter/abonnements/categories?userId=${userId}`, { method: 'GET', raw: true }, { session });
  return readRaw<CategorieEntity[]>(res);
}

// ── Abonnements lecteur (rédacteurs précis) ──
export async function subscribeRedacteur(session: AppSession, userId: string, redacteurId: string, email: string) {
  if (serverEnv.MOCK_MODE) return;
  await callKsm<Response>(
    `/api/v1/newsletter/redacteurs/${redacteurId}/subscribe?userId=${userId}`,
    { method: 'POST', body: { email }, raw: true },
    { session },
  );
}

export async function unsubscribeRedacteur(session: AppSession, userId: string, redacteurId: string) {
  if (serverEnv.MOCK_MODE) return;
  await callKsm<Response>(`/api/v1/newsletter/redacteurs/${redacteurId}/subscribe?userId=${userId}`, { method: 'DELETE', raw: true }, { session });
}

export type FollowedRedacteurEntity = { id: string; email: string; nom: string; prenom: string };

export async function listMyFollowedRedacteurs(session: AppSession, userId: string) {
  if (serverEnv.MOCK_MODE) return [] as FollowedRedacteurEntity[];
  const res = await callKsm<Response>(`/api/v1/newsletter/redacteurs/abonnements?userId=${userId}`, { method: 'GET', raw: true }, { session });
  return readRaw<FollowedRedacteurEntity[]>(res);
}
