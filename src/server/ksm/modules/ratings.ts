import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

// Le module ratings renvoie des entités BRUTES (pas d'enveloppe ApiResponse),
// donc on appelle callKsm en `raw` puis on parse/valide la réponse nous-mêmes.

export type EntityType = 'BLOG' | 'PODCAST' | 'COMMENT' | 'FORUM' | 'DRIVER' | 'AUTHOR' | 'APPLICATION' | 'ORGANISATION';

export type CommentEntity = {
  id: string;
  content: string;
  commentByUser: string;
  commentByName?: string;
  entityId: string;
  entityType: EntityType;
  createdAt?: string;
  updatedAt?: string;
};

export type CommentReplyEntity = {
  id: string;
  content: string;
  replyByUserId: string;
  replyByName?: string;
  commentId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EntityStatsEntity = {
  entityId: string;
  entityType: EntityType;
  totalLikes: number;
  totalDislikes: number;
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

export async function getTotalLikes(session: AppSession, entityId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/totalLikes?entityId=${entityId}`, { method: 'GET', raw: true }, { session });
  return readRaw<number>(res);
}

export async function getTotalDislikes(session: AppSession, entityId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/totalDislikes?entityId=${entityId}`, { method: 'GET', raw: true }, { session });
  return readRaw<number>(res);
}

export async function hasUserLiked(session: AppSession, userId: string, entityId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/hasLiked?userId=${userId}&entityId=${entityId}`, { method: 'GET', raw: true }, { session });
  return readRaw<boolean>(res);
}

export async function hasUserDisliked(session: AppSession, userId: string, entityId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/hasDisliked?userId=${userId}&entityId=${entityId}`, { method: 'GET', raw: true }, { session });
  return readRaw<boolean>(res);
}

export async function likeOrDislike(session: AppSession, userId: string, entityId: string, entityType: EntityType, isLike: boolean) {
  const params = new URLSearchParams({ userId, entityId, entityType, isLike: String(isLike) });
  const res = await callKsm<Response>(`/api/v1/ratings/like-or-dislike?${params}`, { method: 'POST', raw: true }, { session });
  return readRaw<string>(res);
}

export async function rateApplication(session: AppSession, userId: string, score: number, feedback?: string) {
  // entity_id NOT NULL dans la table ratings — on utilise l'UUID de l'org YowNews comme entité fixe pour le type APPLICATION
  const PLATFORM_ENTITY_ID = '00000000-0000-0000-0000-000000000002';
  const params = new URLSearchParams({ userId, entityId: PLATFORM_ENTITY_ID, entityType: 'APPLICATION', score: String(score) });
  if (feedback) params.set('feedback', feedback);
  const res = await callKsm<Response>(`/api/v1/ratings/rate-application?${params}`, { method: 'POST', raw: true }, { session });
  return readRaw<{ message?: string }>(res);
}

export async function getMostLiked(session: AppSession, entityType?: EntityType) {
  const qs = entityType ? `?entityType=${entityType}` : '';
  const res = await callKsm<Response>(`/api/v1/ratings/most-liked${qs}`, { method: 'GET', raw: true }, { session });
  if (res.status === 404) return null;
  return readRaw<EntityStatsEntity>(res);
}

export async function getMostCommented(session: AppSession) {
  const res = await callKsm<Response>('/api/v1/ratings/most-commented', { method: 'GET', raw: true }, { session });
  if (res.status === 404) return null;
  return readRaw<string>(res);
}

export async function listComments(session: AppSession, entityId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/comments/by-entityId?entityId=${entityId}`, { method: 'GET', raw: true }, { session });
  return readRaw<CommentEntity[]>(res);
}

export async function createComment(session: AppSession, input: { content: string; commentByUser: string; commentByName?: string; entityId: string; entityType: EntityType }) {
  const res = await callKsm<Response>('/api/v1/ratings/comments', { method: 'POST', body: input, raw: true }, { session });
  return readRaw<CommentEntity>(res);
}

export async function deleteComment(session: AppSession, commentId: string) {
  await callKsm<Response>(`/api/v1/ratings/comments/${commentId}`, { method: 'DELETE', raw: true }, { session });
}

export async function listReplies(session: AppSession, commentId: string) {
  const res = await callKsm<Response>(`/api/v1/ratings/comment_replies/${commentId}`, { method: 'GET', raw: true }, { session });
  return readRaw<CommentReplyEntity[]>(res);
}

export async function createReply(session: AppSession, commentId: string, input: { content: string; replyByUserId: string; replyByName?: string }) {
  const res = await callKsm<Response>(`/api/v1/ratings/comment_replies/${commentId}`, { method: 'POST', body: input, raw: true }, { session });
  return readRaw<CommentReplyEntity>(res);
}

export async function deleteReply(session: AppSession, replyId: string) {
  await callKsm<Response>(`/api/v1/ratings/comment_replies/${replyId}`, { method: 'DELETE', raw: true }, { session });
}
