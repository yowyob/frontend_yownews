import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

export type ForumStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
export type GroupType = 'FORUM' | 'COMMUNITY' | 'PUBLIC';

export type DiscussionGroup = {
  groupId: string;
  name: string;
  description?: string | null;
  type: GroupType;
  status: ForumStatus;
  creatorId?: string | null;
  creatorName?: string | null;
  members?: string[] | null;
  tenantId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ForumPost = {
  postId: string;
  title: string;
  content: string;
  authorId: string;
  authorName?: string | null;
  groupId: string;
  categoriesIds?: string[] | null;
  numberOfLikes?: number | null;
  numberOfDislikes?: number | null;
  postLikes?: string[] | null;
  postDislikes?: string[] | null;
  commentCount?: number | null;
  creationDate?: string | null;
  modificationDate?: string | null;
};

export type ForumCategorie = {
  categorieId: string;
  categorieName: string;
  groupeId: string;
  postsIds?: string[] | null;
};

export type ForumCommentaire = {
  commentaireId?: string | null;
  content: string;
  authorId: string;
  authorName?: string | null;
  postId: string;
  commentaireParentId?: string | null;
  creationDate?: string | null;
};

async function readRaw<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const parsed = text ? (JSON.parse(text) as { message?: string }) : null;
      if (parsed?.message) message = parsed.message;
    } catch { /* non-JSON */ }
    throw new HttpError({ status: res.status, errorCode: null, message });
  }
  return (text ? (JSON.parse(text) as T) : (null as T));
}

// ── Groupes ──
export async function listPublicGroups(session: AppSession) {
  const res = await callKsm<Response>('/api/v1/forum/groups/public', { method: 'GET', raw: true }, { session });
  return readRaw<DiscussionGroup[]>(res);
}

export async function listAllGroups(session: AppSession) {
  const res = await callKsm<Response>('/api/v1/forum/groups/all', { method: 'GET', raw: true }, { session });
  return readRaw<DiscussionGroup[]>(res);
}

export async function getGroup(session: AppSession, groupId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}`, { method: 'GET', raw: true }, { session });
  return readRaw<DiscussionGroup>(res);
}

export async function listMyGroups(session: AppSession, userId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/mine?userId=${userId}`, { method: 'GET', raw: true }, { session });
  return readRaw<DiscussionGroup[]>(res);
}

export async function updateGroup(session: AppSession, groupId: string, body: Partial<Pick<DiscussionGroup, 'name' | 'description' | 'type'>>) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}`, { method: 'PUT', body, raw: true }, { session });
  return readRaw<DiscussionGroup>(res);
}

export async function deleteGroup(session: AppSession, groupId: string) {
  await callKsm<Response>(`/api/v1/forum/groups/${groupId}`, { method: 'DELETE', raw: true }, { session });
}

export async function createGroup(session: AppSession, body: { name: string; description?: string; type: GroupType; creatorId: string; creatorName?: string; members?: string[] }) {
  const res = await callKsm<Response>('/api/v1/forum/groups', { method: 'POST', body, raw: true }, { session });
  return readRaw<DiscussionGroup>(res);
}

export async function validateGroup(session: AppSession, groupId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}/validate`, { method: 'PUT', raw: true }, { session });
  return readRaw<DiscussionGroup>(res);
}

export async function rejectGroup(session: AppSession, groupId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}/reject`, { method: 'PUT', raw: true }, { session });
  return readRaw<DiscussionGroup>(res);
}

export type JoinRequest = {
  requestId: string;
  groupId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export async function requestToJoinCommunity(session: AppSession, groupId: string, userId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}/requests?userId=${userId}`, { method: 'POST', raw: true }, { session });
  return readRaw<JoinRequest>(res);
}

export async function approveJoinRequest(session: AppSession, requestId: string, adminId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/requests/${requestId}/approve?adminId=${adminId}`, { method: 'PUT', raw: true }, { session });
  return readRaw<JoinRequest>(res);
}

export async function rejectJoinRequest(session: AppSession, requestId: string, adminId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/requests/${requestId}/reject?adminId=${adminId}`, { method: 'PUT', raw: true }, { session });
  return readRaw<JoinRequest>(res);
}

export async function getPendingRequests(session: AppSession, groupId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}/requests`, { method: 'GET', raw: true }, { session });
  return readRaw<JoinRequest[]>(res);
}

export async function addMemberToCommunity(session: AppSession, groupId: string, memberId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/groups/${groupId}/members?memberId=${memberId}`, { method: 'POST', raw: true }, { session });
  return res.ok;
}


// ── Posts ──
export async function listPostsByGroup(session: AppSession, groupeId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/posts/groupe/${groupeId}`, { method: 'GET', raw: true }, { session });
  return readRaw<ForumPost[]>(res);
}

export async function getPost(session: AppSession, postId: string, memberId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/posts/${postId}?memberId=${memberId}`, { method: 'GET', raw: true }, { session });
  return readRaw<ForumPost>(res);
}

export async function createPost(session: AppSession, body: { title: string; content: string; authorId: string; authorName?: string; groupId: string; categoriesIds: string[] }) {
  const res = await callKsm<Response>('/api/v1/forum/posts', { method: 'POST', body, raw: true }, { session });
  return readRaw<ForumPost>(res);
}

export async function toggleLikePost(session: AppSession, postId: string, memberId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/posts/${postId}/like?memberId=${memberId}`, { method: 'POST', raw: true }, { session });
  return readRaw<ForumPost>(res);
}

export async function toggleDislikePost(session: AppSession, postId: string, memberId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/posts/${postId}/dislike?memberId=${memberId}`, { method: 'POST', raw: true }, { session });
  return readRaw<{ numberOfLikes: number; numberOfDislikes: number }>(res);
}

export async function deletePost(session: AppSession, postId: string, memberId: string) {
  await callKsm<Response>(`/api/v1/forum/posts/${postId}?memberId=${memberId}`, { method: 'DELETE', raw: true }, { session });
}

// ── Catégories ──
export async function listCategoriesByGroup(session: AppSession, groupeId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/categories/groupe/${groupeId}`, { method: 'GET', raw: true }, { session });
  return readRaw<ForumCategorie[]>(res);
}

export async function createCategorie(session: AppSession, groupeId: string, body: { categorieName: string }) {
  const res = await callKsm<Response>(`/api/v1/forum/categories/${groupeId}`, { method: 'POST', body, raw: true }, { session });
  return readRaw<ForumCategorie>(res);
}

export async function deleteCategorie(session: AppSession, categorieId: string) {
  await callKsm<Response>(`/api/v1/forum/categories/${categorieId}`, { method: 'DELETE', raw: true }, { session });
}

// ── Commentaires ──
export async function listCommentairesByPost(session: AppSession, postId: string) {
  const res = await callKsm<Response>(`/api/v1/forum/commentaires/post/${postId}`, { method: 'GET', raw: true }, { session });
  return readRaw<ForumCommentaire[]>(res);
}

export async function createCommentaire(session: AppSession, body: { content: string; authorId: string; authorName?: string; postId: string; commentaireParentId?: string }) {
  const res = await callKsm<Response>('/api/v1/forum/commentaires/', { method: 'POST', body, raw: true }, { session });
  return readRaw<ForumCommentaire>(res);
}

export async function deleteCommentaire(session: AppSession, commentaireId: string) {
  await callKsm<Response>(`/api/v1/forum/commentaires/${commentaireId}`, { method: 'DELETE', raw: true }, { session });
}
