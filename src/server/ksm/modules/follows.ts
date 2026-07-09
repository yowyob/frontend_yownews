import 'server-only';
import { HttpError } from '@/lib/types/api';
import type { AppSession } from '@/lib/types/auth';
import { callKsm } from '@/server/ksm/client';

export type FollowCountsView = {
  followers: number;
  following: number;
  isFollowing: boolean;
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
  return (text ? (JSON.parse(text) as T) : (null as T));
}

export async function followUser(session: AppSession, followedId: string): Promise<void> {
  const res = await callKsm<Response>(
    `/api/v1/education/follows/${followedId}`,
    { method: 'POST', raw: true },
    { session }
  );
  await readRaw<void>(res);
}

export async function unfollowUser(session: AppSession, followedId: string): Promise<void> {
  const res = await callKsm<Response>(
    `/api/v1/education/follows/${followedId}`,
    { method: 'DELETE', raw: true },
    { session }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new HttpError({ status: res.status, errorCode: null, message: text || 'Unfollow failed' });
  }
}

export async function getFollowCounts(session: AppSession, userId: string): Promise<FollowCountsView> {
  const res = await callKsm<Response>(
    `/api/v1/education/follows/${userId}/counts`,
    { method: 'GET', raw: true },
    { session }
  );
  return readRaw<FollowCountsView>(res);
}
